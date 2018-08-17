---
author: Ray Heberer
date: 2018-08-16
linktitle: Implementing a DeepMind Baseline StarCraft Reinforcement Learning Agent
title: Implementing a DeepMind Baseline StarCraft Reinforcement Learning Agent
tags: ["starcraft", "reinforcement learning", "deep learning", "artificial intelligence", "machine learning"]
highlight: true
---

<img src="http://www.rayheberer.ai/img/SC2-DeepMind/demo.gif" alt="collect-minerals" width="600px"/>

Implementing deep learning models described in research papers is a challenging yet illuminating experience that shows just how much information can be compressed into a handful of sentences or paragraphs. This week, after having [gotten to know the ropes](http://www.rayheberer.ai/post/sc2-lessons/) of the StarCraft II python API and reinforcement learning environment, I set out to build the first of the three baseline agents described in [StarCraft II: A New Challenge for Reinforcement Learning
](https://arxiv.org/abs/1708.04782).

Specifically, an Advantage Actor-Critic agent that estimates state values and optimal policies using a convolutional neural network architecture based on that in [Asynchronous Methods for Deep Reinforcement Learning](https://arxiv.org/abs/1602.01783). Due to resource constraints, I did not go so far as to implement the "Asynchronous" part of A3C, meaning I only run one agent at a time, instead of many in parallel.

In this post I will highlight the sections from these two research papers informing the agent's design which contained the most information relevant to the technical implementation. I hope that this will serve as a useful example for how to translate researcher-speak into code. My full implementation can be found at https://github.com/rayheberer/SC2Agents/blob/master/agents/actor-critic.py.

Broadly speaking, a deep reinforcement learning agent needs to fulfill four requirements:

1. Receive percepts (inputs) containing information about the state
2. Process the percepts through a deep network to produce a state representation.
3. Use the state representation to inform a policy (a function mapping from states to actions).
4. Use the policy to select actions and interact with the environment.
5. Receive rewards from the environment and use these to improve the modeling of the state and the policy.

This is just an arbitrary breakdown, but I find it to be helpful intuitively and will use it to guide the structure of this article.

### Inputs

> Thus, the main observations come as sets of feature layers which are rendered at N × M pixels... In addition to the screen and minimap, the human interface for the game provides various non-spatial observations.

For an agent to interface with PySC2, it must have a `step(self, obs)` method that is called every timestep. In addition it may have a `reset(self)` method that is called at the beginning of each episode.

I like to use separate classes for my deep neural networks, as shown below. The inputs, which come in the form of feature layers, correspond relatively straightforwardly to placeholders in a Tensorflow graph. The API exposes them in arrays of shape `[channels, y, x]`, so later on in my network I make sure to permute these dimensions appropriately so that they can be fed into convolutional layers, and often make use of `np.expand_dims` when feeding a batch of 1 into the graph. 

```
class AtariNet(object):
# ...
# ...
# ...
    def _build(self):
        # ...
        # ...
        self.screen_features = tf.placeholder(
            tf.int32,
            [None, len(SCREEN_FEATURES), *self.screen_dimensions],
            name="screen_features")

        self.minimap_features = tf.placeholder(
            tf.int32,
            [None, len(MINIMAP_FEATURES), *self.minimap_dimensions],
            name="minimap_features")

        self.flat_features = tf.placeholder(
            tf.float32,
            [None, len(features.Player)],
            name="flat_features")
        # ...
        # ...
```

### State Representation

>  We embed all feature layers containing categorical values into a continuous space which is equivalent to using a one-hot encoding in the channel dimension followed by a 1 × 1 convolution. We also re-scale numerical features with a logarithmic transformation as some of them such as hit-points or minerals might attain substantially high values.

While I found the language of "embedding" to be a little intimidating, the details that followed proved to be simpler to implement. More so than applying the one-hot encoding followed by the convolutional layer, I found that inferring whether a feature was categorical or numerical to be the more laborious task. 

```
def preprocess_spatial_features(features, screen=True):
    """Embed categorical spatial features, log transform numeric features."""
    # ...
    # ...
    preprocess_ops = []
    for index, (feature_type, scale) in enumerate(feature_specs):
        layer = transposed[:, :, :, index]

        if feature_type == sc2_features.FeatureType.CATEGORICAL:
            # one-hot encode in channel dimension -> 1x1 convolution
            one_hot = tf.one_hot(
                layer,
                depth=scale,
                axis=-1,
                name="one_hot")

            embed = tf.layers.conv2d(
                inputs=one_hot,
                filters=1,
                kernel_size=[1, 1],
                strides=[1, 1],
                padding="SAME")

            preprocess_ops.append(embed)
        else:
            transform = tf.log(
                tf.cast(layer, tf.float32) + 1.,
                name="log")

            preprocess_ops.append(tf.expand_dims(transform, -1))

    preprocessed = tf.concat(preprocess_ops, -1)
    return preprocessed
```

---

> It processes screen and minimap feature layers with... two layers with 16, 32 filters of size 8, 4 and stride 4, 2 respectively. The non-spatial features vector is processed by a linear layer with a tanh non-linearity. The results are concatenated and sent through a linear layer with a ReLU activation. <img src="http://www.rayheberer.ai/img/SC2-DeepMind/Atari-Net.png" alt="atarinet" width="400px"/>

Though these paragraphs of the paper correspond to some of the longest chunks of code, they are easily implemented because of the powerful Deep Learning API's available, of which Tensorflow is my tool of choice here.

```
class AtariNet(object):
    # ...
    # ...
    def _build(self):
        # ...
        # ...
        # convolutional layers for minimap features
        self.minimap_conv1 = tf.layers.conv2d(
            inputs=self.minimap_processed,
            filters=16,
            kernel_size=[8, 8],
            strides=[4, 4],
            padding="SAME",
            name="minimap_conv1")

        self.minimap_activation1 = tf.nn.relu(
            self.minimap_conv1,
            name="minimap_activation1")

        self.minimap_conv2 = tf.layers.conv2d(
            inputs=self.minimap_activation1,
            filters=32,
            kernel_size=[4, 4],
            strides=[2, 2],
            padding="SAME",
            name="minimap_conv2")

        self.minimap_activation2 = tf.nn.relu(
            self.minimap_conv2,
            name="minimap_activation2")

        # linear layer for non-spatial features (tanh activation)
        self.flat_linear = tf.layers.dense(
            inputs=self.flat_processed,
            units=64,
            activation=tf.tanh,
            name="flat_linear")

        # flatten and concatenate
        self.screen_flat = tf.layers.flatten(
            self.screen_activation2,
            name="screen_flat")

        self.minimap_flat = tf.layers.flatten(
            self.minimap_activation2,
            name="minimap_flat")

        self.concat = tf.concat(
            values=[self.screen_flat, self.minimap_flat, self.flat_linear],
            axis=1,
            name="concat")

        # linear layer with ReLU activation
        self.state_representation = tf.layers.dense(
            inputs=self.concat,
            units=256,
            activation=tf.nn.relu,
            name="state_representation")
        # ...
        # ...
```

### Policy Representation

> ...we propose to represent the policy in an auto-regressive manner, utilising the chain rule: ![](http://www.rayheberer.ai/img/SC2-DeepMind/Policy-Chain-Rule.png).

One point of confusion for me here was regarding the "chain rule." It refers to the [general product rule](https://en.wikipedia.org/wiki/Chain_rule_(probability) from probability theory, not the rule from calculus that also goes by the name "chain rule."

> In most of our experiments we found it sufficient to model sub-actions independently... For spatial actions (coordinates) we independently model policies to select (discretised) x and y coordinates.

Basically, because any given action in StarCraft II (called function identifiers) might require a variable number of arguments, an efficient way to represent policies over both function identifiers and arguments is to have a policy over each type independently, where the probability of any argument given a function identifier which doesn't require it effectively becomes zero.

There are around 10 general types of function identifiers in PySC2, each requiring a different sequence of arguments. When implementing this in the Tensorflow graph, I found that using a dictionary was a good way to keep track of all the output layers. I also built a dictionary for placeholders that would be used later on in training the network.


```
class AtariNet(object):
    # ...
    # ...
    def _build(self):
        # ...
        # ...
        # action function identifier policy
        self.function_policy = tf.squeeze(tf.layers.dense(
            inputs=self.state_representation,
            units=NUM_ACTIONS,
            activation=tf.nn.softmax),
            name="function_policy")

        # action function argument policies (nonspatial)
        # action function argument placeholders (for optimization)
        self.argument_policy = dict()
        self.arguments = dict()
        for arg_type in actions.TYPES:

            # for spatial actions, represent each dimension independently
            if len(arg_type.sizes) > 1:
                if arg_type in SCREEN_TYPES:
                    units = self.screen_dimensions
                elif arg_type in MINIMAP_TYPES:
                    units = self.minimap_dimensions

                arg_policy_x = tf.layers.dense(
                    inputs=self.state_representation,
                    units=units[0],
                    activation=tf.nn.softmax)

                arg_policy_y = tf.layers.dense(
                    inputs=self.state_representation,
                    units=units[1],
                    activation=tf.nn.softmax)

                self.argument_policy[str(arg_type) + "x"] = arg_policy_x
                self.argument_policy[str(arg_type) + "y"] = arg_policy_y

                arg_placeholder_x = tf.placeholder(
                    tf.float32,
                    shape=[None, units[0]])

                arg_placeholder_y = tf.placeholder(
                    tf.float32,
                    shape=[None, units[1]])

                self.arguments[str(arg_type) + "x"] = arg_placeholder_x
                self.arguments[str(arg_type) + "y"] = arg_placeholder_y

            else:
                arg_policy = tf.layers.dense(
                    inputs=self.state_representation,
                    units=arg_type.sizes[0],
                    activation=tf.nn.softmax)

                self.argument_policy[str(arg_type)] = arg_policy

                arg_placeholder = tf.placeholder(
                    tf.float32,
                    shape=[None, arg_type.sizes[0]])

                self.arguments[str(arg_type)] = arg_placeholder
        # ...
        # ...
```

### Action Selection

> To ensure that unavailable actions are never chosen by our agents, we mask out the function identifier choice of a0 such that only the proper subset can be sampled, imitating how a player randomly clicking buttons on the UI would play. We implement this by masking out actions and renormalising
the probability distribution over a0.

While in my first pass, I implemented this masking outside of the Tensorflow graph, during the actual selection of actions, it could just as well be implemented within the graph, and in a future update I may move it there.

```
class A2CAtari(base_agent.BaseAgent):
    # ...
    # ...
    def _sample_action(self,
                       screen_features,
                       minimap_features,
                       flat_features,
                       available_actions):
        """Sample actions and arguments from policy output layers."""
        screen_features = np.expand_dims(screen_features, 0)
        minimap_features = np.expand_dims(minimap_features, 0)
        flat_features = np.expand_dims(flat_features, 0)

        action_mask = np.zeros(len(FUNCTIONS), dtype=np.int32)
        action_mask[available_actions] = 1

        feed_dict = {self.network.screen_features: screen_features,
                     self.network.minimap_features: minimap_features,
                     self.network.flat_features: flat_features}

        function_id_policy = self.sess.run(
            self.network.function_policy,
            feed_dict=feed_dict)

        function_id_policy *= action_mask
        function_ids = np.arange(len(function_id_policy))

        # renormalize distribution over function identifiers
        function_id_policy /= np.sum(function_id_policy)

        # sample function identifier
        action_id = np.random.choice(
            function_ids,
            p=np.squeeze(function_id_policy))
        # ...
        # ...
```


### Training

> In A3C, we cut the trajectory and run backpropagation after K = 40 forward steps of a network or if a terminal signal is received.

This sentence actually inspired this entire post. Initially having no idea what it meant to "cut the trajectory" I embarked on a journey of knowledge. The following two quotes come from the original A3C paper.

> Like our variant of n-step Q-learning, our variant of actor-critic also operates in the forward view and uses the same mix of n-step returns to update both the policy and the value-function.

Of course, I had skipped directly to the section on A3C agents, but I knew that the trail was getting hotter.

> The algorithm then computes gradients for n-step Q-learning updates for each of the state-action pairs encountered since the last update. Each n-step update uses the longest possible n-step return resulting in a one-step update for the last state, a two-step update for the second last state, and so on for a total of up to t_max updates. The accumulated updates are applied in a single gradient step.

And at last, everything is made clear! No, not really. This was still a highly dense piece of researcher-speak, but with the help of some pseudo-code in the appendix, I finally understood something about how the targets used to train the network would be produced.

```
class A2CAtari(base_agent.BaseAgent):
    # ...
    # ...
    def _get_batch(self, terminal):
        # ...
        # ...
        # calculate discounted rewards
        raw_rewards = list(self.reward_buffer)
        if terminal:
            value = 0
        else:
            value = np.squeeze(self.sess.run(
                self.network.value_estimate,
                feed_dict={self.network.screen_features: screen[-1:],
                           self.network.minimap_features: minimap[-1:],
                           self.network.flat_features: flat[-1:]}))

        returns = []
        # n-step discounted rewards from 1 < n < trajectory_training_steps
        for i, reward in enumerate(raw_rewards):
            value = reward + self.discount_factor * value
            returns.append(value)
        # ...
        # ...
```

### Bonus: The A3C (or A2C) gradient

>  The A3C gradient is defined as follows: ![](http://www.rayheberer.ai/img/SC2-DeepMind/A3C-Gradient.png)

I intend to write about this in the future, but there was so much to unpack in this equation that I thought it would be fun to include. One thing that is interesting is that the policy and value gradients represent qualitatively different things, but smashing them together with simple addition still manages to produce a viable optimization objective (provided with some hyperparameters knobs to turn). Also interesting to me was that the "advantage" - the difference between observed returns and estimated values which the gradient components are scaled by - acts as a constant factor though it includes a network output for value in its calculation. This meant that I had to use [`tf.stop_gradient`](https://www.tensorflow.org/api_docs/python/tf/stop_gradient) so that the weights wouldn't just update to shift value estimates in a way that gamed the equation.

```
class AtariNet(object):
    # ...
    # ...
    def _build_optimization(self):
        # ...
        # ...
        self.advantage = tf.subtract(
            self.returns,
            tf.squeeze(tf.stop_gradient(self.value_estimate)),
            name="advantage")

        # a2c gradient = policy gradient + value gradient + regularization
        self.policy_gradient = tf.multiply(
            self.advantage,
            tf.log(self.action_probability * self.args_probability),
            name="policy_gradient")

        self.value_estimation_gradient = tf.multiply(
            self.advantage,
            tf.squeeze(self.value_estimate),
            name="value_estimation_gradient")

        # only including function identifier entropy, not args
        self.entropy_regularization = tf.reduce_sum(
            self.function_policy * tf.log(self.function_policy),
            name="entropy_regularization")

        self.a2c_gradient = -tf.add_n(
            inputs=[tf.reduce_sum(self.policy_gradient),
                    (self.value_gradient_strength *
                     tf.reduce_sum(self.value_estimation_gradient)),
                    (self.regularization_strength *
                     self.entropy_regularization)],
            name="a2c_gradient")

        self.optimizer = tf.train.RMSPropOptimizer(
            self.learning_rate).minimize(self.a2c_gradient,
                                         global_step=self.global_step)

```

### Conclusion

I have underlined the portions of the two guiding research papers which were among the most important, and showed how they mapped onto code. This project has left me with new respect for just how much researchers are able to condense mountains of information into sentences so short they could be shared on Twitter. 

Though my commentary has been brief - and deliberately so, for I wished to emphasize the relationship between the scientific reporting and the code - I plan to follow up with an article that delves into the _meaning_ of all of these concepts in more depth.