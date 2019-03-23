import os.path
import sys
import tensorflow as tf
import json
import numpy as np
import cPickle

from flask import Flask, jsonify, Response, request

from keras.applications.vgg19 import VGG19, preprocess_input
from keras.preprocessing import image
from keras.models import Model

from sklearn.preprocessing import normalize
from sklearn.neighbors import NearestNeighbors
from sklearn import metrics
from sklearn.model_selection import train_test_split
import json
import pymongo
from bson.json_util import dumps
import time


import base64


app = Flask(__name__)

base_model = VGG19(weights='imagenet')
model = Model(
    inputs=base_model.input, outputs=base_model.get_layer('fc2').output)
graph = tf.get_default_graph()
MYDIR = os.path.dirname(__file__)
VARIABLE_DETECT = 0.3


def get_feature_1_image(image_name):
    img_path = image_name
    img = image.load_img(img_path, target_size=(224, 224))
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    global graph
    with graph.as_default():
        features = model.predict(x)

    features_norm = normalize(features, norm='l2')
    return features_norm


model_detect = cPickle.load(open('./model_detect.sav', 'rb'))
model_regconize = cPickle.load(open('./model_LinearSVC_9.sav', 'rb'))


myclient = pymongo.MongoClient("mongodb://localhost:27017/")
mydb = myclient["flower"]
mycol = mydb["collection_flower_detail"]


@app.route('/')
def hello():
    return "hello"


@app.route("/post", methods=['POST'])
def post_test():
    if request.method == 'POST':
        content = request.get_json()

        # print(content)
        imgdata = base64.b64decode(content['image'])
        filename = 'some_image.jpg'  # I assume you have a way of picking unique filenames
        with open(filename, 'wb') as f:
            f.write(imgdata)

        return "success"


@app.route('/predict', methods=['POST'])
def predict():

    if request.method == 'POST':
        # change request to json
        request_json = request.get_json()

        # change base64 to image and save file
        imgdata = base64.b64decode(request_json['image'])
        path_image_name = "./upload/" + str(time.time()) + ".jpg"
        with open(path_image_name, 'wb') as f:
            f.write(imgdata)
        print("save success")

        # get get feature image upload
        feature_image_upload = get_feature_1_image(path_image_name)

        # detect flower in image
        have_flower = (model_detect.predict(feature_image_upload)[0] == 1)

        if have_flower:
            result_table = model_regconize.decision_function(feature_image_upload)[
                0]
            result_sort = np.sort(result_table)[:: -1]

            label = [np.where(result_table == result_sort[0])[0][0]+1,
                     np.where(result_table == result_sort[1])[0][0]+1,
                     np.where(result_table == result_sort[2])[0][0]+1,
                     np.where(result_table == result_sort[3])[0][0]+1,
                     np.where(result_table == result_sort[4])[0][0]+1]

            arr_flower = []

            for item in label:
                mongo_item = mycol.find_one(
                    {'index': item}, {"_id": 0, "detail": 0})
                arr_flower.append(json.loads(dumps(mongo_item)))

            # print(arr_flower)
            print(label)
            return jsonify(status="success",
                           data=arr_flower)
        else:
            data = {"status": "no_flower", "data": "null"}
            return jsonify(status="no_flower",
                           data="null")


# export FLASK_APP=index.py
# export FLASK_RUN_PORT=8050
# python -m flask run
