import {bindable} from 'aurelia-templating';
import {inject} from 'aurelia-dependency-injection';
import {getLogger} from 'aurelia-logging';
import {bindingMode} from 'aurelia-binding';
import {NodeModel} from './node-model';
import {TreeNode} from './tree-node';
import {fireEvent} from '../common/events';

@inject(Element)
export class TreeView {
  @bindable() expandOnFocus: boolean = false;
  @bindable() selectOnFocus: boolean = false;
  @bindable() nodes: NodeModel[];
  @bindable() multiSelect: boolean = false;
  @bindable({
    defaultBindingMode: bindingMode.twoWay
  }) focused: NodeModel = null;
  @bindable({
    defaultBindingMode: bindingMode.twoWay
  }) selected: NodeModel[] = [];
  subscriptions = [];

  // comparers
  @bindable() compareEquality = null;

  bind() {
    this.expandOnFocus = (this.expandOnFocus === true || this.expandOnFocus === 'true');
    this.multiSelect = (this.multiSelect === true || this.multiSelect === 'true');
    this.selectOnFocus = (this.selectOnFocus === true || this.selectOnFocus === 'true');
  }

  constructor(element) {
    this.element = element;
    this.log = getLogger('tree-view');
    this.compareEquality = (args) => { return args.a === args.b; };

    let templateElement = this.element.querySelector('tree-node-template');
    if (templateElement) {
      this.templateElement = templateElement;
    } else {
      // this.log.warn('ctor - no template element');
    }
  }

  attached() { }

  detached() { }

  created() {
    if (this.templateElement) {
      if (this.templateElement.au) {
        let viewModel = this.templateElement.au.controller.viewModel;
        this.log.debug('viewModel', viewModel);
      } else {
        this.log.warn('no viewmodel found for template', this.templateElement);
      }
    } else {
      // this.log.warn('created - no template element');
    }
  }

  nodesChanged(newValue, oldValue) {
    if (newValue) {
      // && this.templateElement
      this.enhanceNodes(newValue);
      this.preselectNodes(newValue);
    }
  }

  enhanceNodes(nodes: NodeModel[]) {
    nodes.forEach(node => {
      if (node.children && typeof node.children !== 'function') {
        this.enhanceNodes(node.children);
      }
      if (this.templateElement) {
        node._template = this.templateElement.au.controller.viewModel.template;
        node._templateModel = this.templateElement.au.controller.viewModel.model;
      }
      // node._tree = this;
      node._tree = {
        focusNode: this.focusNode.bind(this),
        selectNode: this.selectNode.bind(this),
        deselectNode: this.deselectNode.bind(this),
        multiSelect: this.multiSelect
      };
    });
  }

  preselectNodes(nodes: NodeModel[]) {
    nodes.forEach(node => {
      if (this.selected.find(n => this.compareEquality({a: node, b: n}))) {
        node.selected = true;
        if (!this.multiSelect) {
          node.focused = true;
        }
        node.expandNode().then(() => {
          this.preselectNodes(node.children);
        });
      }
    });
  }

  _suspendEvents = false;
  _suspendUpdate = false;
  focusNode(node: NodeModel, modifiers = {}) {
    if (!this._suspendUpdate) {
      if (node !== this.focused) {
        if (this.focused) {
          this._suspendUpdate = true;
          this.focused.focused = false;
          this._suspendUpdate = false;
        }
        this.focused = node;
        fireEvent(this.element, 'focused', { node });
        if (this.expandOnFocus) {
          node.expandNode();
        }
      }
      if (this.selectOnFocus) {
        // node.selected = !node.selected;
        node.selected = true;
        // this.selectNode(node);
        if (modifiers['ctrl']) {
          let recurse = !!modifiers['shift'];
          node.selectChildren(recurse);
        }
      }
    }
  }

  selectNode(node: NodeModel) {
    let existing = this.selected.findIndex(n => this.compareEquality({a: node, b: n}));
    if (existing === -1) {
      this.log.debug('selecting node', node);
      if (!this.multiSelect) {
        this._suspendEvents = true;
        this.selected.forEach(n => n.selected = false);
        this._suspendEvents = false;
      }
      this.selected.push(node);
      if (!this._suspendEvents) {
        fireEvent(this.element, 'selection-changed', { nodes: this.selected });
      }
    }
  }

  deselectNode(node: NodeModel) {
    let index = this.selected.findIndex(n => this.compareEquality({a: node, b: n}));
    if (index === -1) {
      this.log.error('node not found in selected', node);
    } else {
      this.log.debug('deselecting node', node);
      this.selected.splice(index, 1);
      if (!this._suspendEvents) {
        fireEvent(this.element, 'selection-changed', { nodes: this.selected });
      }
    }
  }

  expandOnFocusChanged(newValue) {
    this.expandOnFocus = (newValue === true || newValue === 'true');
  }

  clearSelection() {
    this.selected.forEach(node => {
      node.selected = false;
    });
    if (this.focused) {
      this.focused.focused = false;
    }
  }

  // moveNode(node: TreeNode, target: TreeNode | TreeView) {
  //   console.log('moveNode', node, target);
  //   if (target instanceof TreeNode) {
  //     target.model.children.push(node.model);
  //   }
  //   // target.model.children.push(node.model);
  //   let parent = node.element.parentNode;
  //   let children;
  //   while (parent !== null && parent.tagName !== 'TREE-NODE') {
  //     parent = parent.parentNode;
  //   }
  //   if (parent === null) {
  //     children = this.nodes;
  //   } else {
  //     children = parent.au['tree-node'].viewModel.model.children;
  //   }
  //   let pos = children.indexOf(node.model);
  //   children.splice(pos, 1);
  // }

  findParentNode(node: TreeNode): TreeNode {
    let parent = node.element.parentNode;
    let parentModel = null;
    while (parent !== null && parent.tagName.toUpperCase() !== 'TREE-NODE') {
      if (parent.tagName.toUpperCase() === 'TREE-VIEW') {
        parent = null;
      } else {
        parent = parent.parentNode;
      }
    }
    if (parent) {
      parentModel = parent.au['tree-node'].viewModel;
    }
    return parentModel;
  }

  findRootNode(node: TreeNode): TreeNode {
    let root = null;
    let parent = this.findParentNode(node);
    while (parent !== null) {
      root = parent;
      parent = this.findParentNode(parent);
    }
    return root;
  }

  expandAll(visitor: (node: NodeModel, parent: NodeModel) => boolean) {
    return Promise.all(this.nodes.map(node => this.expandNodeAndChildren(node, null, visitor)))
      .then(results => {
        let joined = [];
        results.forEach(j => {
          if (j !== null) {
            joined = joined.concat(j);
          }
        });
        return joined;
      });
  }

  expandNodeAndChildren(node: NodeModel, parent: NodeModel, visitor: (node: NodeModel, parent: NodeModel) => boolean) {
    return Promise.resolve(visitor(node, parent))
    .then(result => {
      if (node.hasChildren) {
        return node.expandNode(true).then(() => {
          return Promise.all(node.children.map(child => {
            return this.expandNodeAndChildren(child, node, visitor);
          }).concat(result ? node : null));
        })
        .then((potentials) => {
          let joined = [];
          potentials
            .filter(p => p !== null)
            .forEach(p => joined = joined.concat(p));
          return joined;
        });
      }
      return result ? node : null;
    });
  }

  search(visitor: (node: NodeModel, parent: NodeModel) => boolean) {
    return this.expandAll(visitor)
    .then(results => {
      let searchResults = [];
      results.forEach(res => {
        let treeNode = res._element;
        if (treeNode) {
          let root = this.findRootNode(treeNode);
          if (root) {
            if (searchResults.indexOf(root.model) === -1) {
              searchResults.push(root.model);
            }
          } else {
            if (searchResults.indexOf(res) === -1) {
              searchResults.push(res);
            }
          }
        } else {
          this.log.warn('tree-node not found for', res);
        }
      });
      return searchResults;
    });
  }

  moveNode(node: TreeNode, target: TreeNode | TreeView, sibling: TreeNode) {
    this.log.debug('moveNode', node, target, sibling);

    // if (sibling) { }
    if (target instanceof TreeNode) {
      target.insertChild(node.model, sibling ? sibling.model : null);
      let parent = this.findParentNode(node);
      if (parent === null) {
        parent = this;
        parent.removeNode(node);
      } else {
        parent.removeChild(node.model);
      }
    } else if (target instanceof TreeView) {
      let posNode = this.nodes.indexOf(node.model);
      let posSibling = sibling
        ? this.nodes.indexOf(sibling.model)
        : this.nodes.length - 1;
      if (posNode > -1 && posSibling > -1) {
        this.nodes.splice(posNode, 1);
        this.nodes.splice(posSibling, 0, node.model);
      } else if (posSibling > -1) {
        // move from node to TreeView
        let parent = this.findParentNode(node);
        // parent.removeNode(node);
        parent.removeChild(node.model);
        this.nodes.splice(posSibling, 0, node.model);
      } else {
        this.log.warn('sibling not found');
      }
    }
  }

  removeNode(node: TreeNode) {
    // console.warn('removeNode not implemented');
    let pos = this.nodes.indexOf(node.model);
    this.nodes.splice(pos, 1);
  }
}
