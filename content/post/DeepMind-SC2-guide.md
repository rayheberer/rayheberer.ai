---
author: Ray Heberer
date: 2018-08-16
linktitle: Implementing a DeepMind Baseline StarCraft Reinforcement Learning Agent
title: Implementing a DeepMind Baseline StarCraft Reinforcement Learning Agent
tags: ["starcraft", "reinforcement learning", "deep learning", "artificial intelligence", "machine learning"]
highlight: false
---

Implementing deep learning models described in research papers is a challenging yet illuminating experience that shows just how much information can be compressed into a handful of sentences or paragraphs. This week, after having [gotten to know the ropes](http://www.rayheberer.ai/post/sc2-lessons/) of the StarCraft II python API and reinforcement learning environment, I set out to build the first of the three baseline agents described in [StarCraft II: A New Challenge for Reinforcement Learning
](https://arxiv.org/abs/1708.04782). 

Specifically, an Advantage Actor-Critic agent that estimates state values and optimal policies using a convolutional neural network architecture based on that in [Asynchronous Methods for Deep Reinforcement Learning](https://arxiv.org/abs/1602.01783). Due to resource constraints, I did not go so far as to implement the "Asynchronous" part of A3C, meaning I only run one agent at a time, instead of many in parallel.

In this post I will highlight the sections of the two research papers informing the agent's design which contained the most information relevant to the technical implementation. I hope that this will serve as a useful example for engineers seeking to read research papers and need a perspective on what to focus on, as well as a general reinforcement learning guide - though I intend to write more about this specifically.

Broadly speaking, a deep reinforcement learning agent needs to fulfill four requirements:

1. Receive percepts (inputs) containing information about the state
2. Process the percepts through a deep network to produce a state representation.
3. Use the state representation to inform a policy (a function mapping from states to actions).
4. Use the policy to select actions and interact with the environment.
5. Receive rewards from the environment and use these to improve the modeling of the state and the policy.

This is just an arbitrary breakdown, but I find it to be helpful intuitively and will use it to guide the structure of this article.

### Inputs

> Thus, the main observations come as sets of feature layers which are rendered at N × M pixels (where N and M are configurable, though in our experiments we always used N = M)... In addition to the screen and minimap, the human interface for the game provides various non-spatial observations.

### State Representation

>  We embed all feature layers containing categorical values into a continuous space which is equivalent to using a one-hot encoding in the channel dimension followed by a 1 × 1 convolution. We also re-scale numerical features with a logarithmic transformation as some of them such as hit-points or minerals might attain substantially high values.

> It processes screen and minimap feature layers with... two layers with 16, 32 filters of size 8, 4 and stride 4, 2 respectively. The non-spatial features vector is processed by a linear layer with a tanh non-linearity. The results are concatenated and sent through a linear layer with a ReLU activation.

### Policy Representation

> ...we propose to represent the policy in an auto-regressive manner, utilising the chain rule:
![](http://www.rayheberer.ai/img/SC2-DeepMind/Policy-Chain-Rule.png)

> In most of our experiments we found it sufficient to model sub-actions independently...

### Action Selection

> To ensure that unavailable actions are never chosen by our agents, we mask out the function identifier choice of a0 such that only the proper subset can be sampled, imitating how a player randomly clicking buttons on the UI would play. We implement this by masking out actions and renormalising
the probability distribution over a0.


### Training

> In A3C, we cut the trajectory and run backpropagation after K = 40 forward steps of a network or if a terminal signal is received.

> Like our variant of n-step Q-learning, our variant of actor-critic also operates in the forward view and uses the same mix of n-step returns to update both the policy and the value-function.

> The algorithm then computes gradients for n-step Q-learning updates for each of the state-action pairs encountered since the last update. Each n-step update uses the longest possible n-step return resulting in a one-step update for the last state, a two-step update for the second last state, and so on for a total of up to tmax updates. The accumulated updates are applied in a single gradient step.

![](http://www.rayheberer.ai/img/SC2-DeepMind/A3C-Gradient.png)

### Conclusion