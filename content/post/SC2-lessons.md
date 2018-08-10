---
author: Ray Heberer
date: 2018-08-09
linktitle: Lessons and Mistakes from my First Reinforcement Learning StarCraft Agent
title: Lessons and Mistakes from my First Reinforcement Learning StarCraft Agent
tags: ["starcraft", "reinforcement learning", "deep learning", "artificial intelligence", "machine learning"]
highlight: false
---

![](http://www.rayheberer.ai/img/SC2-lessons/DQN2.gif)

Seeing as the beginning of August marked the 14th month since my entry into data science and machine learning, I decided that I had waited around long enough without satisfying one of the deeper wishes of the inner child who kept me motivated through this past year of intensive learning. It was finally time to apply what I knew to the game of [StarCraft II](https://starcraft2.com/en-us/).

A year ago on this day, Deepmind and Blizzard [released an API](https://deepmind.com/blog/deepmind-and-blizzard-open-starcraft-ii-ai-research-environment/) that provided a learning environment for reinforcement learning agents. At the same time, they reported the results acheived by some baseline RL agents, demonstrating that the game presented a unprecedented challenge, as none of the agents were able to defeat the easiest scripted bots in the full game. This motivated the release of "mini-games" that still ran in the SC2 simulation, but were themselves much simpler task environments.

Today, I crystalize some of the lessons I learned in my first week working with [PySC2](https://github.com/deepmind/pysc2). Many of these lessons are tied to mistakes and missteps I made along the way. 

In this time, I implemented a Deep Q Learning agent (DQN) that used a reduced state and action space and managed to learn a policy that did much better than random on the simplest of the mini-games. I did this as a sort of sanity check, to facilitate fluency with a new API, and ended up learning a lot more than I thought I would. Any feedback the reader may be able to provide, especially difficulties in working with my implementation, would be highly valuable to me, so I encourage everyone to take a look at my repository here: https://github.com/rayheberer/SC2Agents (some Python experienced required to comprehend).

Now, 10 lessons from my first deep reinforcement learning agent built for StarCraft II...

#### 1. Implement a scripted agent first!

I spent about a day just feeling paralyzed by the scale of the codebase I was working with. It was like a technical, programmer's version of writer's block, and I felt terrible after the day passed without me writing a single line of code. The next day, I began by implementing a scripted agent that queued random movements, and the payoff was huge! Suddenly I knew what sort of methods agents needed to have to hook into the API, and was able to print all sorts of things to my logs when running agents and thereby explore the feature layers provided and their respective shapes and data types.

#### 2. Read the documentation carefully, not only while writing code, but before beginning.

If one factor driving my "programmer's block" had been the feeling that I needed to immediately do something deep learning related, another was my reluctance to give myself permission to sit back and carefully read the documentation and other pieces of relevant background. Overcoming this allowed me to avoid some traps, such as the fact that features are provided in y-major screen coordinates (*y*,*x*), while actions expect them as (*x*, *y*).

#### 3. Don't be overwhelmed if existing open-source implementations of agents are hard to follow.

In the past, I've found some success in getting someone else's implementation up and running in order to understand the problem at hand. Although there exist some great open-source implementations of Deep RL agents closely following the design of those in the original DeepMind/Blizzard paper, many of them are no longer compatible with the current version of PySC2, and are tough to follow just because of the difficulty of tracking down the source of all the API functions used. 

I still recommend taking a look at the following implementations when getting started, but don't spend too much time on them, and don't feel like you need a full understanding, or even a significant partial understanding, before moving on.

* [pysc2-agents (xhujoy)](https://github.com/xhujoy/pysc2-agents)
* [pysc2-rl-agents (simonmeister)](https://github.com/simonmeister/pysc2-rl-agents)
* [pysc2-examples (chris-chris)](https://github.com/chris-chris/pysc2-examples)

#### 4. Manage dependencies properly, and check for artifacts from the local machine environment.

I had a nasty experience where, after having some successful runs one night and shutting down my laptop, everything was broken the next morning. Good package management habits is the best form of prevention for such experiences.

#### 5. Start with the simplest mini-game.

One challenge posed by this project is that running tests and getting insight for how some code is behaving is more expensive than usual. To use Donald Norman's terms, the "[gulf of evaluation](https://www.interaction-design.org/literature/book/the-glossary-of-human-computer-interaction/gulf-of-evaluation-and-gulf-of-execution)" is larger than one might be used to. I found that starting with the simplest mini-game (MoveToBeacon) allowed me to narrow this gulf a little more, and also yielded some unexpected insights into the actual properties of DQNs.

#### 6. Maintain records of all runs, especially if each one is expensive.

After a few days, when I had what seemed to be a working agent implemented, it was time to begin training. When performing a gradient-based update at every step, the game would run at around 1-2 fps, meaning that even 1,000 episodes of MoveToBeacon would take upwards of 12 hours. What I consider to be one of my biggest mistakes was being too quick to pull the trigger on runs where the agent seemed to be learning a suboptimal policy.

I am striving now to be meticulous in my reporting of results, both the successful and the unsuccessful. My experience training a very simple model on a relatively simple task environment (albeit with a large state space) has shown me firsthand that much of what one finds in research papers does not really convey how sensitive to hyperparameter settings and temperamental some deep RL agents can be. Keeping good records is the responsible thing to do, and will go a long way towards improving the reproducibility of deep RL.

![](http://www.rayheberer.ai/img/SC2-lessons/deepmind-graph.png)
*DeepMind results: the faint lines represent 99 experiments with different hyperparameter settings.*

#### 7. If using some form of random exploration, consider signalling somehow if an action is random or not.

I must have wasted hours staring at my agent randomly moving around the screen. Like watching a sub-par video game player, it was an extremely frustrating experience. Worse was that, as humans are wont to do, I started seeing patterns where they didn't exist, vastly overestimating the current likelihood my agent had of selecting a nonrandom action. This sort of time-draining fixation was eradicated efficiently just by implementing a way to directly indicate if an action was nonrandom, and I found myself less and less prone to letting my screen hypnotize me.

#### 8. Use Tensorboard!

Tensorboard is a great tool for catching things like exploding gradients, and agents overestimating the value of actions in a way that creates feedback loops. It is easy to hook up to a project, and there is really no reason not to utilize it.

![](http://www.rayheberer.ai/img/SC2-lessons/tensorboard.png)

#### 9. Use Tensorflow variables to maintain information across multiple runs when restoring models from checkpoints.

It would be strange for me not to have learned any technical lessons. One thing I learned through getting more experience with Tensorflow was how to work with untrainable [variables](https://www.tensorflow.org/guide/variables). I ended up using these sorts of variables in keeping count of a "global episode" that would persist across different runs loading the same model from checkpoints. Later, when I started using a separate network to provide the target values used in training my online DQN, my improved understanding of Tensorflow variables (and variable scopes) made periodically copying the weights from one network to another very easy.

#### 10. Fixed Q targets stabilize value learning.

One piece of RL know-how that I got to acquire firsthand was the motivation behind using fixed network to calculate target values used in training the network used to inform the policy. Seeing my unit beeline for some corner at the beginning of each episode and stay there happily really drove home the fact - in a personal and visceral way - that DQNs tend to overestimate values. 

Later, seeing my agent incidentally finding a high value associated with one or two edges of a beacon, but failing to learn that just moving to the center would be the best thing to do, informed my decision to raise the minimum probability of taking random actions for a later run. This concept has also provided me with a logical jump-off point for exploring double/dueling DQNs, which I plan to get into soon.

---

Working on this project so far has been both exhilarating and rewarding. If I were to come up with a global, domain-independent lesson to draw from this, it would be "don't wait too long to explore something your inner child has been curious about." After all, who knows if you're overestimating the value of your current activities, and are on the edge of something truly rewarding.