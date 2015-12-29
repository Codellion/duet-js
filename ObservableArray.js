var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="ObservableItem.ts" />
var ObservableArray = (function (_super) {
    __extends(ObservableArray, _super);
    function ObservableArray(name) {
        var items = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            items[_i - 1] = arguments[_i];
        }
        var _self = this;
        _super.call(this);
        this._name = name;
    }
    Object.defineProperty(ObservableArray.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    ObservableArray.prototype.initialize = function (items) {
        var _this = this;
        items.forEach(function (n) { return _super.prototype.push.call(_this, n); });
    };
    ObservableArray.prototype.push = function () {
        var _this = this;
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        var res = 0;
        items.forEach(function (n) {
            res = _super.prototype.push.call(_this, n);
            _this.elementAdded = new CustomEvent(_this.name + "elementAdded", { detail: new ObservableItem(_this.name, n, res) });
            document.dispatchEvent(_this.elementAdded);
        });
        return res;
    };
    ObservableArray.prototype.pop = function () {
        var index = this.length - 1;
        var res = _super.prototype.pop.call(this);
        this.elementRemoved = new CustomEvent(this.name + "elementRemoved", { detail: new ObservableItem(this.name, res, index) });
        document.dispatchEvent(this.elementRemoved);
        return res;
    };
    ObservableArray.prototype.unshift = function () {
        var _this = this;
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        var res = 0;
        items.forEach(function (n) {
            res = _super.prototype.unshift.call(_this, n);
            _this.elementAdded = new CustomEvent(_this.name + "elementAdded", { detail: new ObservableItem(_this.name, n, res) });
            document.dispatchEvent(_this.elementAdded);
        });
        return res;
    };
    ObservableArray.prototype.shift = function () {
        var res = _super.prototype.shift.call(this);
        this.elementRemoved = new CustomEvent(this.name + "elementRemoved", { detail: new ObservableItem(this.name, res, 0) });
        document.dispatchEvent(this.elementRemoved);
        return res;
    };
    ObservableArray.prototype.change = function (index, value) {
        var origin = this[index];
        for (var prop in origin) {
            if (value[prop])
                origin[prop] = value[prop];
        }
    };
    return ObservableArray;
})(Array);
