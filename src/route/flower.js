import express from 'express';
import Joi from 'joi';
import mongo from 'mongodb';
import assert from 'assert';
import { error, success } from './defaultRespone';

import {
  MONGODB_URL,
  DATABASE_NAME,
  COLLECTION_LIST_ALL_IMAGE,
  COLLECTION_FLOWER_DETAIL,
} from '../constant/DATABASE';
import { findDocuments, updateDocument, updateManyDocument } from '../database';

const app = express.Router();

const updateCountView = async id => {
  await mongo.connect(
    MONGODB_URL,
    { useNewUrlParser: true },
    (err, database) => {
      assert.equal(null, err);
      console.log('Connected successfully to server');
      const db = database.db(DATABASE_NAME);

      updateDocument(
        db,
        COLLECTION_FLOWER_DETAIL,
        { index: id },
        { $inc: { count_view: 1 } },
        result => {},
      );
    },
  );
};

app.get('/detail/:id', async (req, res) => {
  const schema = {
    id: Joi.number()
      .min(0)
      .required(),
  };

  const validation = Joi.validate(req.params, schema);
  if (validation.error) {
    res.send(error(validation));
    return;
  }

  const id = parseInt(req.params.id, 10);

  await mongo.connect(
    MONGODB_URL,
    { useNewUrlParser: true },
    (err, database) => {
      assert.equal(null, err);
      console.log('Connected successfully to server');
      const db = database.db(DATABASE_NAME);

      findDocuments(db, COLLECTION_FLOWER_DETAIL, { index: id }, result => {
        if (result.toString() == '') {
          res.send(error(err));
        } else {
          res.send(success(result));
          updateCountView(id);
        }
      });
    },
  );
});

app.get('/search', async (req, res) => {
  await mongo.connect(
    MONGODB_URL,
    { useNewUrlParser: true },
    (err, database) => {
      assert.equal(null, err);
      console.log('Connected successfully to server');
      const db = database.db(DATABASE_NAME);

      // sap xep ket qua theo muc do pho bien count_view: dem so luong truy cap
      // lay ra 10 loai dau tien
      const collection = db.collection(COLLECTION_FLOWER_DETAIL);
      collection
        .find({ count_view: { $gt: 0 } })
        .sort({ count_view: -1 })
        .limit(10)
        .toArray((err1, docs) => {
          assert.equal(err1, null);
          if (docs.toString() == '') {
            res.send(error(err1));
          } else {
            res.send(success(docs));
          }
        });
    },
  );
});

app.get('/search/:keyword', async (req, res) => {
  const schema = {
    keyword: Joi.string()
      .min(2)
      .required(),
  };

  // validate key word truyen vao
  const validation = Joi.validate(req.params, schema);
  if (validation.error) {
    res.send(error(validation));
    return;
  }

  // dua keyword ve dang RegExp %keyword%
  let keyword = req.params.keyword.toString().toUpperCase();
  keyword = new RegExp(keyword, 'i');

  await mongo.connect(
    MONGODB_URL,
    { useNewUrlParser: true },
    (err, database) => {
      assert.equal(null, err);
      console.log('Connected successfully to server');
      const db = database.db(DATABASE_NAME);

      findDocuments(
        db,
        COLLECTION_FLOWER_DETAIL,
        {
          // tim kiem ten loai hoa theo tieng viet, tieng anh, latin
          $or: [
            { name_vi: { $regex: keyword } },
            { name_en: { $regex: keyword } },
            { name_latin: { $regex: keyword } },
          ],
        },
        result => {
          if (result.toString() == '') {
            res.send(error(err));
          } else {
            res.send(success(result));
          }
        },
      );
    },
  );
});

module.exports = app;
