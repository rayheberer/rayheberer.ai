import tensorflow as tf

# constants
num_hidden = 128
num_layers = 3

# placeholders
def set_placeholders(X, y, labeling=True):
    batch_size, length, features = X.shape # Batch size x time steps x features.
    num_classes = y.shape[-1]

    data = tf.placeholder(tf.float32, [None, length, features])
    
    if labeling:
        target = tf.placeholder(tf.float32, [None, length, num_classes])
    else:
        target = tf.placeholder(tf.float32, [None, num_classes])
    
    return data, target


def weight_and_bias(in_size, out_size):
    weight = tf.truncated_normal([in_size, out_size], stddev=0.01)
    bias = tf.constant(0.1, shape=[out_size])
    return tf.Variable(weight), tf.Variable(bias)

# network architecture
def lstm_cell():
  return tf.contrib.rnn.BasicLSTMCell(num_hidden)

def lstm_layers(num_layers, data):
    network = tf.contrib.rnn.MultiRNNCell(
            [lstm_cell() for _ in range(num_layers)])
    output, _state = tf.nn.dynamic_rnn(network, data, dtype=tf.float32)
    
    return output, _state

# labeling (predict for every timestep),classification (predict at last timestep)
def softmax_labeling(target, output, num_hidden, num_classes):
    max_length = int(target.get_shape()[1])
    num_classes = int(target.get_shape()[2])
    label_weight, label_bias = weight_and_bias(num_hidden, num_classes)
    
    output = tf.reshape(output, [-1, num_hidden])
    
    prediction = tf.nn.softmax(tf.matmul(output, label_weight) + label_bias)
    prediction = tf.reshape(prediction, [-1, max_length, num_classes])
    
    return prediction

def labeling_loss(target, prediction):
    label_cross_entropy = -tf.reduce_sum(
        target * tf.log(prediction), [1, 2])
    loss = tf.reduce_mean(label_cross_entropy)
    return loss

def softmax_classification(target, output, num_hidden, num_classes):
    output = tf.transpose(output, [1, 0, 2])
    last = tf.gather(output, int(output.get_shape()[0]) - 1)
    
    weight, bias = weight_and_bias(num_hidden, num_classes)
    
    prediction = tf.nn.softmax(tf.matmul(last, weight) + bias)
    return prediction

def classification_loss(target, prediction):
    cross_entropy = -tf.reduce_sum(target * tf.log(prediction))
    return cross_entropy

# optimizer
def RMSProp(learning_rate, loss):
    optimizer = tf.train.RMSPropOptimizer(learning_rate)
    return optimizer.minimize(loss)

# training
def train_label(X, y, epochs, batch_size, sess, label_loss, data,
                label_target, label_optimizer, feedback_rounds=10):
    num_batches = len(X)//batch_size
    
    for epoch in range(epochs):
        print("epoch", epoch+1)
        start_idx = 0
        
        for minibatch in range(num_batches):
            end_idx = start_idx + batch_size
            x_batch = X[start_idx:end_idx]
            y_batch = y[start_idx:end_idx]
            
            batch_loss = sess.run(label_loss, feed_dict={
                    data: x_batch,
                    label_target: y_batch})
            sess.run(label_optimizer, feed_dict={
                    data: x_batch,
                    label_target: y_batch})
            
            start_idx += batch_size
            if minibatch%feedback_rounds == 0:
                print("Step", minibatch, "Loss", batch_loss)    

def train(X, y, epochs, batch_size, sess,
          loss, data, target, optimizer, feedback_rounds=10):
    num_batches = len(X)//batch_size

    for epoch in range(epochs):
        print("epoch", epoch+1)
        start_idx = 0
        
        for minibatch in range(num_batches):
            end_idx = start_idx + batch_size
            x_batch = X[start_idx:end_idx]
            y_batch = y[start_idx:end_idx]
            
            batch_loss = sess.run(loss, feed_dict={
                    data: x_batch,
                    target: y_batch})
            sess.run(optimizer, feed_dict={
                    data: x_batch,
                    target: y_batch})
            
            start_idx += batch_size
            if minibatch%feedback_rounds == 0:
                print("Step", minibatch, "Loss", batch_loss)