"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var aurelia_dependency_injection_1 = require("aurelia-dependency-injection");
var aurelia_logging_1 = require("aurelia-logging");
var aurelia_task_queue_1 = require("aurelia-task-queue");
var aurelia_pal_1 = require("aurelia-pal");
var aurelia_templating_1 = require("aurelia-templating");
var data_source_1 = require("./data-source");
var TreeView = (function () {
    function TreeView(element, taskQueue) {
        this.element = element;
        this.taskQueue = taskQueue;
        this.expandOnFocus = false;
        this.multiSelect = false;
        this.processChildrenKey = 'ctrl';
        this.processChildrenRecursiveKey = 'alt';
        this.compareEquality = function (args) { return args.a === args.b; };
        this.log = aurelia_logging_1.getLogger('aurelia-tree-view');
        this.nodes = [];
        this.subscriptions = [];
    }
    TreeView.prototype.bind = function () {
        this.multiSelect = (this.multiSelect === 'true' || this.multiSelect === true);
        if (!this.dataSource) {
            this.dataSource = new data_source_1.DataSource(this.taskQueue);
        }
        // TODO: use a settings service or something similar
        this.dataSource.settings.compareEquality = this.compareEquality;
        this.dataSource.settings.expandOnFocus = this.expandOnFocus;
        this.dataSource.settings.multiSelect = this.multiSelect;
        this.dataSource.settings.processChildrenKey = this.processChildrenKey;
        this.dataSource.settings.processChildrenRecursiveKey = this.processChildrenRecursiveKey;
        this.subscriptions.push(this.dataSource.subscribe(this.handleDataSource.bind(this)));
    };
    TreeView.prototype.unbind = function () {
        // this.log.debug('disposing subscriptions:', this.subscriptions.length);
        this.subscriptions.forEach(function (sub) { return sub.dispose(); });
    };
    TreeView.prototype.attached = function () {
        // if (this.templateElement) {
        //   const template = this.templateElement.template;
        //   const viewModel = this.templateElement.model;
        //   this.templateInfo = {
        //     template,
        //     viewModel
        //   }
        //   this.dataSource.settings.templateInfo = this.templateInfo;
        //   this.log.debug('template element found - template info:', this.templateInfo);
        // } else {
        //   this.log.debug('no template element');
        // }
    };
    TreeView.prototype.handleDataSource = function (event, nodes) {
        // this.taskQueue.queueTask(() => {
        this.log.debug('data source', event, nodes);
        var customEvent;
        switch (event) {
            case 'collapsed':
                customEvent = aurelia_pal_1.DOM.createCustomEvent('collapsed', { bubbles: true, detail: { nodes: nodes } });
                this.element.dispatchEvent(customEvent);
                break;
            case 'expanded':
                customEvent = aurelia_pal_1.DOM.createCustomEvent('expanded', { bubbles: true, detail: { nodes: nodes } });
                this.element.dispatchEvent(customEvent);
                break;
            case 'loaded':
                this.nodes = nodes;
                break;
            case 'selectionChanged':
                customEvent = aurelia_pal_1.DOM.createCustomEvent('selection-changed', { bubbles: true, detail: { nodes: nodes } });
                this.element.dispatchEvent(customEvent);
                break;
        }
        // });
    };
    TreeView.prototype.templateElementChanged = function (newValue) {
        var _this = this;
        this.log.debug('templateElementChanged');
        var template = newValue.template;
        var viewModel = newValue.model;
        this.templateInfo = {
            template: template,
            viewModel: viewModel
        };
        this.dataSource.settings.templateInfo = this.templateInfo;
        if (this.nodes.length) {
            var temp_1 = this.nodes;
            this.nodes = [];
            this.taskQueue.queueTask(function () { _this.nodes = temp_1; });
        }
    };
    __decorate([
        aurelia_templating_1.bindable()
    ], TreeView.prototype, "compareEquality", void 0);
    __decorate([
        aurelia_templating_1.bindable()
    ], TreeView.prototype, "expandOnFocus", void 0);
    __decorate([
        aurelia_templating_1.bindable()
    ], TreeView.prototype, "multiSelect", void 0);
    __decorate([
        aurelia_templating_1.bindable()
    ], TreeView.prototype, "processChildrenKey", void 0);
    __decorate([
        aurelia_templating_1.bindable()
    ], TreeView.prototype, "processChildrenRecursiveKey", void 0);
    __decorate([
        aurelia_templating_1.child('tree-node-template')
    ], TreeView.prototype, "templateElement", void 0);
    TreeView = __decorate([
        aurelia_dependency_injection_1.inject(Element, aurelia_task_queue_1.TaskQueue)
    ], TreeView);
    return TreeView;
}());
exports.TreeView = TreeView;
