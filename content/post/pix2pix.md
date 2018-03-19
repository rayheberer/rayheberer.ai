---
author: Ray Heberer
date: 2017-10-15
linktitle: Training a Tensorflow pix2pix cGAN on FloydHub to generate body transformations
title: Training a Tensorflow pix2pix cGAN on FloydHub to generate body transformations
tags: ["Tensorflow", "FloydHub", "pix2pix", "GAN", "Artificial Intelligence"]
highlight: false
---

---

![](https://rayheberer.netlify.com/img/pix2pix/dreamfit.jpeg "Adithya Saladi, Sachin Bakshi, and myself receiving a Challenge Prize for our digital stay-smoke-free support project: Lung Beat. Our 2nd-Place Prize winning project, DreamFit, is the subject of this article.")

---

For the best reading experience, find this post on [Medium](https://medium.com/@rayheberer/training-a-tensorflow-pix2pix-cgan-on-floydhub-to-generate-body-transformations-2e550e287804).

Being able to visualize results can be a powerful form of motivation and preparation. However, in the fitness domain, it can be difficult for one to imagine what results in terms of appearance might look like for them individually. How then might we bring people closer to their ideal bodies, and help them feel less distant from their goals, as well as their progress?
This was the question that I, along with two extremely talented engineers, set out to solve during the roughly 48-hour long [Fitness & Health Burda Hackday](http://burdahackday.de/) in Munich on the weekend of October 7th. Our idea: to dream up pictures that might plausibly resemble someone in the future should they adopt a lifestyle of healthy eating and exercise, using conditional generative adversarial networks.

In this post, I will briefly outline GANs for those who are unfamiliar with them. Next, I will provide some guidance for training one such model for which a Tensorflow implementation exists on GitHub on the GPU training and deployment platform FloydHub. Finally, I will leave some of my thoughts about the hackathon, sharing what I consider to be the most important factors that lead to us taking home the 2nd Place prize, as well as opinions on how an AI engineer can fit into a team in such a setting.

*Having trouble with restoring Tensorflow 1.0.0 models on FloydHub? Skip to section 3.*


---

Generative Adversarial Networks were first proposed by Ian Goodfellow and others in Yoshua Bengio's Montreal lab in 2014, and have received much attention since then, with Yann LeCun calling them:

> ...the most interesting idea in the last 10 years in ML, in my opinion.

For an overview of generative models in general, which are unsupervised learning techniques that seek to learn the distribution of some data (e.g. words in a corpus or pixels in images of cats), I would highly recommend [OpenAI's blog post](https://blog.openai.com/generative-models/) on the topic.

Briefly, GANs consist of two networks with opposing objectives, seeking an equilibrium in a sort of game being played between them. The "Generator" transforms some input that is sampled from what is called the "latent space" - often times this is a vector with components sampled from some probability distribution - into the output space that contains what it is that we desire to generate (for example the space of 32x32 RGB images). The "Discriminator" is simply a classifier that receives both outputs from the Generator, and real objects, then is trained to determine whether the input it is observing is generated, or real.

The idea is that when both networks are performing optimally, the Generator creates images that are distributed within their respective output space in the same way that real inputs to the Discriminator are.

Some popular adversarial network architectures are:

* [Deep Convolutional GANs](https://github.com/Newmu/dcgan_code), that perhaps unsurprisingly are used to generate realistic images.
* [Conditional GANs](https://phillipi.github.io/pix2pix/), that learn the distribution of output images **given paired** inputs for applications such as image-to-image translation
* [Cycle-Consistent GANs](https://junyanz.github.io/CycleGAN/), which can learn image-to-image mappings without requiring paired inputs.

For a comprehensive set of resources regarding GANs, I recommend Holger Caesar's [really-awesome-gan](https://github.com/nightrome/really-awesome-gan) list.

![](https://rayheberer.netlify.com/img/pix2pix/pix2pix.png "How the Discriminator and Generator are optimized in a cGAN")
---
We chose to use a conditional GAN, or cGAN, to learn the mapping between male adults shown in "body transformation" marketing images. A [Tensorflow implementation](https://github.com/affinelayer/pix2pix-tensorflow) exists that very faithfully ports the code the authors of the [cGAN paper](https://arxiv.org/pdf/1611.07004v1.pdf) wrote in Torch.


---

> A really big computer is a time machine.

.[someone](https://twitter.com/BenedictEvans/status/902281728194076674) once said. Of course, they were most likely referring to more lofty aims than training an existing architecture during a 48-hour hackathon. However, the fact stands that without GPU computing power, my team would not have had any results to show. Since my own hardworking CPU could only process images at about 1 per every 5 seconds, we had to look to the cloud for solutions.
I opted to use [FloydHub](https://www.floydhub.com/) to train and store the adjusted weights of my network over AWS EC2 or Google Cloud for a number of reasons.

* The process of ["mounting" data](https://docs.floydhub.com/guides/data/mounting_data/) with just a handful of shell commands, without having to deal with FTP was easy and intuitive
* Logs were always readily and immediately available, without having to request or download them
* As a startup with a strong sense of community, I was confident that I could find help within a short time-span if I encountered issues
* Pricing was competitive

Running the Tensorflow implementation of pix2pix on FloydHub did require some minor tweaks to the code, which I'll detail here in the hopes that anyone trying a similar project in the future might be saved some time.

A typical training command would look like the following:

```floyd run --gpu --data rayheberer/datasets/dreamfit/4:/dreamfit_data 'python pix2pix.py --mode train --output_dir /output --max_epochs 200 --input_dir /dreamfit_data --which_direction AtoB```

* The `--data path:/dir` mounts a FloydHub dataset to the job and makes it available at `/dir`
* Saved outputs, such as model checkpoints, must always stored in `/output`; this is an important detail

Affinelayer's pix2pix implementation was made in Tensorflow 1.0.0, which means that the `save_relative_paths` option for [tf.train.saver](https://www.tensorflow.org/api_docs/python/tf/train/Saver) was not yet implemented (check out [this GitHub issue](https://github.com/tensorflow/tensorflow/issues/9146) if you're interested in learning a bit about the development history of Tensorflow).

Also, instead of restoring from a single `.ckpt` file, the model saves a number of files to the output directory specified during training, which can be then chosen as a checkpoint directory during testing or exporting.

![](https://rayheberer.netlify.com/img/pix2pix/floydoutput.png "Checkpoints saved to /output during pix2pix training.")
---
Why might this be an issue when training on a distributed computing platform? Well, because in lines 625 and 725 of [pix2pix.py](https://github.com/affinelayer/pix2pix-tensorflow/blob/master/pix2pix.py), the argument to the saver is recovered using ` tf.train.latest_checkpoint(a.checkpoint)`, which will yield an absolute path of `/output` on FloydHub.

Since the checkpoint directory of one job on FloydHub can't be mounted to `/output` in a subsequent job, as that directory will be reserved, an error will be thrown when attempting to restore the model.

![](https://rayheberer.netlify.com/img/pix2pix/pix2pixerror.png "I became far too familiar with this.")
---
The workaround fix is incredibly simple. For a more involved project, I would recommend adding an additional parameter that can be set in a command, but for a weekend, simple changing lines 625 and 725 of pix2pix.py would be enough.

If I were to test or export model-99200 shown in the image above, I would simple replace the instances of `checkpoint = tf.train.latest_checkpoint(a.checkpoint)` with `checkpoint = r'/model/model-99200'` and then make sure to mount the data as so:

```floyd run --gpu --data rayheberer/projects/burda-gan/6/output:/model 'python pix2pix.py --mode test --output_dir /output --input_dir test --checkpoint /model'```

Note the values passed into the --data and --checkpoint parameters.


---

How successful were we in learning the mapping between pre/post body transformation images in males? Nowhere near realistic-looking results, but perhaps also results that were much better than they deserved to be considering we had less than 150 pairs of images to train on.

I employed two [standard](http://cs231n.github.io/convnet-tips/) forms of data augmentation: random cropping and horizontal reflections. We did also pair reflected pre- images with unreflected post- images, and vice versa, but did not have time to test whether this improved generalization over only pairing reflected and non-reflected images with each other.

I'll leave below our best generalization results on new data, as well as comparisons between how a model trained without data augmentation for the same amount of wall-clock time performed relative to the model trained with augmented data. Keep in mind that training the models overnight during the hackathon may not have been enough time for them to fully converge, but the results were fascinating.

![](https://rayheberer.netlify.com/img/pix2pix/beforeafter.png "I gave myself a horrifying, low-resolution 8-pack over the weekend. What did you do?")

![](https://rayheberer.netlify.com/img/pix2pix/2gans.png "Above: generated images conditioned on a test input made by a model without data augmentation; below: same, but from a model trained on augmented data")
---
So you see, interesting, but not much beyond that just yet. If anything, I considered these low-fi generated images a proof of concept that GANs could have commercial applications given larger datasets to work with.

I'd like to leave with a couple parting thoughts to AI and Machine Learning Engineers that find themselves on a team making a prototype with very limited time.

1. Be a leader. 2 days is not enough time to do your job well as an engineer, since training ML models is an iterative and often very empirical process. Embrace the role of the "expert" by finding novel ways to apply new techniques and knowing where to look to find existing solutions, and don't be discouraged if you don't do anything technically groundbreaking yourself.

2. Be honest, but don't be afraid to be unscientific. Prototypes are in many ways facades. For a demo, sometimes the best results must be cherry-picked, and this is expected. When communicating and pitching an idea, there may not be enough time to qualify every statement you make or backpedal on something you said that wasn't strictly true. Everyone has a point where they can be maximally effective while presenting, without losing their integrity. Find yours.

If you're interested in seeing me apply these principles in my first-ever pitch, skip to 1:36:00 on the [recorded live session](https://www.facebook.com/burdabootcamp/videos/1949527058599222/?hc_ref=ARTazM7D4AaJ7lQEIi2dMVTHn1jg0FRAolmEoczpGyLlRzCwp0eZvIYAuNvTwLouKl4&pnref=story). Please, be lenient with me.