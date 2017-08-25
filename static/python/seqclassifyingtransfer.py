import numpy as np
import pandas as pd
import tensorflow as tf

import data_preprocessing as dt
import model

# use insuranceQ for character dictionary
print("Processing data...")
insuranceQ = pd.read_csv('insuranceQ.csv', usecols=[1])
q_raw = []
for q in insuranceQ['0']:
    q_raw.append(q.lower())
    
kp_data = pd.read_csv('kp_original.tsv', sep='\t')
#kp_data = kp_data[kp_data['answer']!='missing']
kp_data = kp_data.sample(frac=1, random_state=41)

text = ' '.join(insuranceQ['0'].str.lower()) + ' '.join(kp_data.question.str.lower())

chars, char_indices, indices_char  = dt.get_dicts(text)

# read in data
max_len = 45

X_label = dt.strings_to_array(q_raw, chars, char_indices, indices_char)
y_label = dt.strings_to_array(q_raw, chars, char_indices, indices_char, lag=True)

X = dt.strings_to_array(kp_data.question.str.lower(), 
                        chars, char_indices, indices_char, max_len)
y, a_index, index_a = dt.strings_to_classes(kp_data.answer)

X_train, X_test = X[:900], X[900:]
y_train, y_test = y[:900], y[900:]

# constants
batch_size, length, features = X.shape # Batch size x time steps x features.
num_hidden = 128
num_layers = 3

label_classes = y_label.shape[2]
num_classes = y.shape[1]

# placeholders
print("Building model...")
data, label_target = model.set_placeholders(X_label, y_label)
_, target = model.set_placeholders(X, y, labeling=False)

# network
output, _state = model.lstm_layers(num_layers, data)

# Softmax layer.
label_predict = model.softmax_labeling(label_target, output, num_hidden, label_classes)
class_predict = model.softmax_classification(target, output, num_hidden, num_classes)

# cost function
label_loss = model.labeling_loss(label_target, label_predict)
class_loss = model.classification_loss(target, class_predict)

# optimizer
learning_rate = 0.003
label_optimizer = model.RMSProp(learning_rate, label_loss)
class_optimizer = model.RMSProp(learning_rate, class_loss)

# training
label_epochs = 2
label_batch_size = 20

class_epochs = 100
class_batch_size = 20

sess = tf.Session()
sess.run(tf.global_variables_initializer())

print("Training seq2seq model...")
model.train_label(X_label, y_label, label_epochs, label_batch_size, sess, 
            label_loss, data, label_target, label_optimizer)

print("Training seq2class model...")
model.train(X_train, y_train, class_epochs, class_batch_size, sess, 
            class_loss, data, target, class_optimizer)

# evaluation
def predict_class(question, return_string=True):

    question = question.reshape(1, question.shape[0], question.shape[1])
    predict = sess.run(class_predict, feed_dict={data: question})
    
    if return_string:
        return index_a[np.argmax(predict)]
    else:
        return np.argmax(predict)

def get_accuracy(questions, answers):
    accuracy = 0
    for i in range(questions.shape[0]):
        predicted = predict_class(questions[i], return_string=False)
        answer = np.argmax(answers[i])
        if predicted == answer:
            accuracy += 1
    return accuracy / questions.shape[0]

def compare_predictions(questions, answers):
    ans = []
    for a in answers:
        ans.append(index_a[np.argmax(a)])
    preds = pd.DataFrame(columns=["predicted", "actual"])
    for i in range(questions.shape[0]):
        preds.loc[i] = ([predict_class(questions[i]), ans[i]])
    
    return preds

print("Evaluating model...")
accuracy = get_accuracy(X_test, y_test)
print("Accuracy:", accuracy)
print("Gathering predictions...")
preds = compare_predictions(X_test, y_test)
print("Done.")