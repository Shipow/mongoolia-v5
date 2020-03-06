"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createAlgoliaMongooseModel;

var _lodash = require("lodash");

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function createAlgoliaMongooseModel({
  index,
  attributesToIndex
}) {
  class AlgoliaMongooseModel {
    // properties comming from mongoose model after `.loadClass()`
    // * clears algolia index
    // * removes `_algoliaObjectID` from documents
    static clearAlgoliaIndex() {
      var _this = this;

      return _asyncToGenerator(function* () {
        yield index.clearIndex();
        yield _this.collection.updateMany({
          _algoliaObjectID: {
            $exists: true
          }
        }, {
          $set: {
            _algoliaObjectID: null
          }
        });
      })();
    } // * clears algolia index
    // * push collection to algolia index


    static syncWithAlgolia({
      force
    } = {}) {
      var _this2 = this;

      return _asyncToGenerator(function* () {
        if (force) yield _this2.clearAlgoliaIndex();
        const docs = yield _this2.find({
          _algoliaObjectID: {
            $eq: null
          }
        });

        const _ref = yield index.addObjects(docs.map(doc => (0, _lodash.pick)(doc, attributesToIndex))),
              objectIDs = _ref.objectIDs;

        return yield Promise.all((0, _lodash.zipWith)(docs, objectIDs, (doc, _algoliaObjectID) => {
          doc._algoliaObjectID = _algoliaObjectID;
          return doc.save();
        }));
      })();
    } // * set one or more settings of the algolia index


    static setAlgoliaIndexSettings(settings, forwardToReplicas) {
      return index.setSettings(settings, {
        forwardToReplicas
      });
    } // * search the index


    static algoliaSearch({
      query,
      params,
      populate
    }) {
      var _this3 = this;

      return _asyncToGenerator(function* () {
        const searchParams = _objectSpread({}, params, {
          query
        });

        const data = yield index.search(searchParams); // * populate hits with content from mongodb

        if (populate) {
          // find objects into mongodb matching `objectID` from Algolia search
          const hitsFromMongoose = yield _this3.find({
            _algoliaObjectID: {
              $in: (0, _lodash.map)(data.hits, "objectID")
            }
          }, (0, _lodash.reduce)(_this3.schema.obj, (results, val, key) => _objectSpread({}, results, {
            [key]: 1
          }), {
            _algoliaObjectID: 1
          })); // add additional data from mongodb into Algolia hits

          const populatedHits = data.hits.map(hit => {
            const ogHit = (0, _lodash.find)(hitsFromMongoose, {
              _algoliaObjectID: hit.objectID
            });
            return (0, _lodash.omit)(_objectSpread({}, ogHit ? ogHit.toJSON() : {}, hit), _algoliaObjectID);
          });
          data.hits = populatedHits;
        }

        return data;
      })();
    } // * push new document to algolia
    // * update document with `_algoliaObjectID`


    addObjectToAlgolia() {
      var _this4 = this;

      return _asyncToGenerator(function* () {
        const object = (0, _lodash.pick)(_this4.toJSON(), attributesToIndex);

        const _ref2 = yield index.addObject(object),
              objectID = _ref2.objectID;

        _this4.collection.updateOne({
          _id: _this4._id
        }, {
          $set: {
            _algoliaObjectID: objectID
          }
        });
      })();
    } // * update object into algolia index


    updateObjectToAlgolia() {
      var _this5 = this;

      return _asyncToGenerator(function* () {
        const object = (0, _lodash.pick)(_this5.toJSON(), attributesToIndex);
        yield index.saveObject(_objectSpread({}, object, {
          objectID: _this5._algoliaObjectID
        }));
      })();
    } // * delete object from algolia index


    deleteObjectFromAlgolia() {
      var _this6 = this;

      return _asyncToGenerator(function* () {
        yield index.deleteObject(_this6._algoliaObjectID);
      })();
    } // * schema.post('save')


    postSaveHook() {
      if (this._algoliaObjectID) {
        this.updateObjectToAlgolia();
      } else {
        this.addObjectToAlgolia();
      }
    } // * schema.post('update')


    postUpdateHook() {
      if (this._algoliaObjectID) {
        this.updateObjectToAlgolia();
      }
    } // * schema.post('remove')


    postRemoveHook() {
      if (this._algoliaObjectID) {
        this.deleteObjectFromAlgolia();
      }
    }

  }

  return AlgoliaMongooseModel;
}