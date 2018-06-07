---
author: Ray Heberer
date: 2017-06-06
linktitle: Getting Started with Hyperparameter Tuning
title: Getting Started with Hyperparameter Tuning
tags: ["hyperparameters", "model tuning", "machine learning", "cross validation", "AUC"]
highlight: false
---

Raise your hand if you've heard these before:

* "Hyperparameter tuning is more of an art than a science." 
* "Tuning Machine Learning models is like black magic."

These are nice, evocative statements that may serve well in instilling a sense of intrigue towards our work as Data Scientists in the laypeople we have casual conversations with. They are also great sources of complacency, good for taking fuzziness in one's understanding and attributing it to fuzziness in one's discipline. However, such sayings do little in the way of actually helping us approach hyperparameter tuning.

![](/img/lambdaschool/hyperparameters/data-scientist-as-superman.jpeg)
_[source](http://www.themeasurementstandard.com/2015/07/why-data-scientist-is-being-called-the-sexiest-job-of-the-21st-century/)_

What these phrases can do is inform us that the practice of hyperparameter tuning will not offer the comforts of theoretical grounding and long-established convention that you would expect to find in the mature sciences. There may be best practices, but you should expect them to still be in a state of relative flux, and information on them to be distributed somewhat haphazardly. This implies that approaching hyperparameter tuning systematically will require more out of a human than the ability to pattern-match with engineering tables. 

If being systematic, experimenting and applying your own judgment are truly especially important in hyperparameter tuning, then it is better to establish a reasonable baseline approach and start sooner than to scour the literature and find the most up-to-date set of design patterns and rules of thumb. Here, I provide the reasoning for what I consider to be an informed baseline. I've also demonstrated some things programmatically; feel free to skip to the bottom to see the code, or ignore them altogether.

## Hyperparameters: what actually are they?
In the context of a machine learning, "parameter" has a rather narrow meaning. In supervised learning problems, the goal typically is to find a mapping from features to the outcomes. This is often a function of the features, parameterized by some set of weights, or numbers, so that the model's predictions are _y_ = _f_(_x_;θ). Here θ represents the weights; in other words, the parameters. The form of the function - whether it is linear, polynomial, or something more exotic - is in this case fixed by the model.

The predictions of such models are functions of their parameters, and the objective/loss function the model seeks to optimize tends to be a function of the predictions. If the loss is differentiable, which it often is, then how it changes with respect to each parameter will be computable. This gives parameters the neat property that they can be updated and found automatically, and gives the act of doing so the name "learning."

Hyperparameters do not have this property that the predictions, and therefore the loss, of a model will be differetiable functions of them. Because of this, the algorithm that finds the optimal values of some model's parameters usually won't also be able to find optimal hyperparameters. Instead, we will have to turn to either something like derivative-free optimization, which will require an outer loop and therefore more computational resources, or simply let a human designer run experiments and make decisions - the dreaded "art" of manual hyperparameter tuning.

Hyperparameters of those things that are part of what fixes the form of the parameterized function whose optimal weights are then learned to solve a problem. They are higher-level design decisions about the models themselves, not components of models that are adjustable during the training process. This distinction is easy enough to understand, and I expect many to already be familiar with the difference between parameters and hyperparameters. More important to me is motivating why the problem of finding good hyperparameters differs from the process of optimizing the internal parameters of a model during training.

## Data for optimization, data for estimation
Maybe you've had the experience of participating in a data science competition on [Kaggle](http://kaggle.com/) or elsewhere, and finding that despite following the golden rule of not testing your models on your training data, waiting for your leaderboard position determining score is a suspenseful, heart-pounding trial. Your estimates of your models' performance are consistently optimistic, and often by wide, unpredictable margins.

Dataset partitioning should be done with the goal of making us feel less surprised about the performance of our deployed models. The corollary to this is that we can feel confident that we are pursuing real improvements when doing things like hyperparameter tuning, and not like we are chasing ghosts.

Given a dataset, and some learning algorithms, there are two things that we would like to be able to do with our data.

1. Provide a high-fidelity sample whose empirical distribution captures that of the underlying statistical population.
2. Estimate how well a model will generalize to other samples of data drawn from the same environment.

We want to be able to do __(1)__ because, well, that's kind of what makes the "learning" in machine learning useful. As for __(2)__, one reason being able to do so would be desirable is because such information helps us decide what model to use in the first place, and with what hyperparameters. A second reason is more business related. Presumably, our machine learning models are part of a product, or contribute to some decisions and policies. Being able to anticipate its performance and reliability is important strategically.

Now that we've stated three objectives, there are a few natural follow-up questions we can ask to explore the problem at hand. Can we use the same set of data to accomplish all our goals, or will we need separate sets for each? How does our performance in achieving each objective scale with the amount of data we have for it? Where are we introducing randomness into our methodologies and what effects does it have?

We probably know that "Thou shalt not test on your training set" is one of the commandments of machine learning. From this we can guess that we will need to partition our dataset into different subsets, responsible for different objectives. If you have some experience, you also know that typically the data will be split into not only training and test sets, but also validation sets. I think I can do a little to motivate this, so that I can base my decisions off of something a little more grounded than "Andrew Ng told me so."

The training, validation, and test sets each correspond to one of the objectives outlined earlier. The training set will be used to solve the optimization problem yielding a statistical model, and for this to be useful, must be representative of the sort of data we expect to encounter when using this trained model. 

The validation set will be used to estimate how well our trained models generalize. Ideally, we would like to live in a world where models that score better on the validation set also end up performing better when deployed. If that is true, then even if the estimates we obtain from the validation set are biased, they will still be useful relative to one another in selecting a model or particular configuration of hyperparameters.

Finally, the test set will be used in an attempt to produce an unbiased estimation of model performance. This goes towards those more strategy and business oriented objectives I mentioned earlier.

So if the training set is used for optimization, and the validation and test sets are used for statistical estimation, how much data do we need for each? Especially when dealing with the sort of nonconvex optimization problems that correspond to training more complex models such as deep neural networks, we want as much data as possible for optimization. On the other hand, tasks like making point estimates and determining reasonable confidence intervals are far less data-gluttonous undertakings.

![](/img/lambdaschool/hyperparameters/accuracy-histograms.png)

Once you know how confident you wish to be in your estimates of model performance, it is just a matter of statistics to determine the sample size required to reach this confidence. Factors like the number of features and the characteristics of their distributions effect the exact outcome, but usually something around the ballpark of 1,000 data points is sufficient. Note that this is independent of the overall size of the dataset. Regardless of whether you have 25,000 or 75,000 samples from the same underlying population, you can have the same degree of confidence in the estimates of generalization you procured from a subset of 1,000.

![](/img/lambdaschool/hyperparameters/accuracy-deviations.png)

## Running experiments, and why validation sets become stale
As hinted earlier, the validation set will be used repeatedly to evaluate multiple different models. We would like to know to what extent differing performances on the validation set contain actionable information that can be used to select and tune models.

In order to answer this question, I will need to discuss sampling variance. There are many sources of variance in statistics, and sampling variance is the part of the spread of some measured outcome across different experiments that occurs due to fact that different samples of data are being used. Beware, this is distinct from _sample_ variance, a measure of spread in the distribution of the _points_ ___within___ a sample. Sampling variance measures the spread of a _statistic_ ___between___ samples. For 1-dimensional data, the standard deviation of the means across different samples is known as the standard error.

Because the validation set can be thought of as a randomly sampled subset of the full dataset, we can be sure that various statistics of it would have some amount of sampling variance. Even if we only partition the data once, we can imagine that if we were to do it many times, we would end up with slightly different validation sets each time.

With that in mind, it might not be too much of a stretch to think of the classification accuracy of one particular model on the validation data as a "statistic" of the validation set. So it seems reasonable enough to assume that to some extent the accuracies we observe are due to the "luck of the draw" introduced by the random sampling that produced the validation set, and that not everything can be attributed to one model truly learning a better, more generalizable relationship than another.

Imagine that we have a binary classification problem, and happen to be tuning the hyperparameters of a random forest model. If you're not familiar with random forests, think of them as taking a bunch of decision trees and having them vote. 

A single decision tree produces decision boundaries that consist of orthogonal lines through the feature space. The decision boundary of a few decision trees voting can have some more curves. This motivates the idea that increasing the amount of decision trees ensembled together into a random forest - the hyperparameter called `n_estimators` in the [sklearn implementation](http://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html) - will enable more and more "wiggly" decision boundaries.

![](/img/lambdaschool/hyperparameters/decision-boundaries.png)

Some random subsets of data will have more wiggly optimal decision boundaries than others. If it turns out that our validation set is slightly more wiggly than usual, then a random forest with more estimators will be shown to outperform one with slightly fewer. But this result has more to do with the randomness introduced by sampling than the true structure of the data. Here we begin to see what is meant when people say that information from the validation set bleeds over, causing its estimates to become optimistic.

Validation sets do become stale over time, but most of this can't be explained simply by the component of model accuracy attributed to sampling variance, when tuning a single parameter. It has more to do with the fact that in practice, we don't reset the search space completely when tuning one set of hyperparameters, and then another. In any case, the key takeaway is the understanding that the estimates of model performance produced by the validation set will become increasingly optimistic the more we iterate.

Cross validation can mitigate this by providing, in addition to the point estimates of model performance, estimates of the variance of these metrics across different samples. In small datasets, it has the additional benefit of allowing us to make these estimates for the purposes of model comparison without taking away preciously scarce training data. "Double dipping" into the first two objectives I outlined in the section above.

Note that using cross validation will not slow the rate with which seemingly better models and hyperparameters display optimistic results. It will however provide an additional dimension of information with which to make informed decisions about whether to actually use things that produced the most minute of improvements in the next iteration.

In the era of big data and expensive-to-train models, cross validation is often not feasible. But when running many experiments with models with little computational training cost, it is useful to remember that cross validation still has utility even when there is plenty of data to go around.

Of course, it would be possible to use the held-out test set to estimate to what extent results on the validation set have become biased. But if this information is used to inform model design decisions, then soon enough the test set will start producing biased estimates itself! Certainly, it's not uncommon that the test set has a slightly different distribution than the current data in a production environment, leading to another source of bias. In practice, machine learning models in industry should have a frequently renewing set of data for training, tuning and final testing in order to avoid this infinite regress of fitting to test sets.

## Which hyperparameters should I tune?
The first thing you should do when encountering this question is to seriously consider the null answer: __none of them__ (yet). Have you fully explored your data? Are your intuitions about it well-developed and grounded on some good visualizations? Have you gone back to fix that preprocessing step which you kind of hacked because you were excited to start modeling?

If so, then it's time to do a little research.

I'm afraid I don't have any gems of insight to offer here. Getting to know your models and their hyperparameters is simply a matter of discipline and experience. Read the documentation, the research papers, and the online discussions. From there, pick out a small amount of high-impact hyperparameters and begin with that.

In this sense, tuning hyperparameters is a bit like designing a weight lifting routine. You can spend a lot of time fiddling with sets and reps and exercises, but doing something rather than nothing (given the related background safety concerns, which I've tried to outline for this context above) seems to be where most of the work is at. I'm sorry I can't give you "5 simple model tuning tricks (PhDs hate him)." But if you have any, please do share.

## How should I select values to explore?

The predictive power as well as the robustness of a model are nonlinear, multivariable functions of the data and all of their hyperparameters. This, in a vacuum, implies that we cannot justify _a priori_ the strategy of tuning one hyperparameter, fixing it while tuning another hyperparameter, and so on. However, it may be intractable to exhaustively search through the space of all possible combinations of every hyperparameter.

In many things, there exists a tradeoff between interpretibility and performance. I stretch some definitions here by asserting that if something requires more formal or technical knowledge, it is less interpretable.

With that in mind, let's talk about grid search. To me, grid search is one of the lowest performing hyperparameter search strategies that also happens to be the most interpretable. If you are unfamiliar with grid search, it is the intuitive way of searching through multiple hyperparameters by specifying (usually evenly spaced) values of each hyperparameter, and then validating models trained with every combination of these values.

If you're familiar with grid search, you perhaps also know that random search is touted to be better, in that it is more likely to find configurations with better performance, when searching over the same range of values for the same number of iterations.

![](/img/lambdaschool/hyperparameters/search.png)

The thing about random search is that it is highly dependent on the numeric range from which hyperparameter values will be sampled. It is also slightly less interpretable than grid search. Because of this, one suggestion would be to use a wide-comb grid search to locate the relevant orders of magnitude for numeric hyperparameters. It can also be used to make judgments regarding hyperparameters that take on discrete values, since it will be obvious if one choice always outperforms the other. After this, pass the baton to random search.

Of course, at the end of the day we should all strive towards more automation. For hyperparameter tuning, this means investing the time required to understand some derivative free optimization methods well enough to debug them, and intuit in what scenarios they may provide an edge. Bayesian optimization is a good starting point, and there exist good tutorials online for this.

## Conclusion

Hyperparameter tuning is an optimization problem, but one that is typically made more difficult by the lack of things like a smooth error surface with respect to the hyperparameters. Here, I discussed some of the background and challenges of hyperparameter tuning, especially related to the validation of model performance and the need to partition data. Though I have spoken a little abstractly, I hope to have shown that approaching the task in a way that is systematic yet adaptable is possible, and have provided some demonstrations that ground the conventional industry wisdom in something tangible.

## Sample Code

<script src="https://gist.github.com/rayheberer/16cbbfead8aef036c6d0b9e3b980d405#file-validation_variance-py"></script>
<script src="https://gist.github.com/rayheberer/16cbbfead8aef036c6d0b9e3b980d405#file-random_forest_decision-py"></script>
<script src="https://gist.github.com/rayheberer/16cbbfead8aef036c6d0b9e3b980d405#file-hyperparameter_search-py"></script>


## Resources
* scikit learn documentation for [`train_test_split`](http://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html), [`StratifiedKFold`](http://scikit-learn.org/stable/modules/generated/sklearn.model_selection.StratifiedKFold.html), [`GridSearchCV`](http://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GridSearchCV.html), [`RandomizedSearchCV`](http://scikit-learn.org/stable/modules/generated/sklearn.model_selection.RandomizedSearchCV.html)
* [Definition of Sampling Variance](http://ccsg.isr.umich.edu/index.php/resources/advanced-glossary/sampling-variance)
* [What is the difference between sample variance and sampling variance?](https://stats.stackexchange.com/questions/16982/what-is-the-difference-between-sample-variance-and-sampling-variance?rq=1)
* Wikipedia entries for [Standard Error](https://en.wikipedia.org/wiki/Standard_error), [Derivative-free Optimization]
(https://en.wikipedia.org/wiki/Derivative-free_optimization)