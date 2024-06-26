# JHipster Migrate Blueprint

> A JHipster blueprint that helps you upgrade between JHipster versions.

[![NPM version][npm-image]][npm-url]
[![Generator][github-generator-image]][github-generator-url]
[![Integration Test][github-samples-image]][github-samples-url]

# Introduction

This is a [JHipster](https://www.jhipster.tech/) blueprint, that is meant to be used in a JHipster application.

# Prerequisites

For this [JHipster](https://www.jhipster.tech/) blueprint, we expect you have an JHipster generated application.

# Installation

To install or update this blueprint:

```bash
npm install -g generator-jhipster-migrate
```

# Usage

To use this blueprint, run the command:

```bash
jhipster-migrate
```

A wizard/advanced mode is available running the command below:

```bash
jhipster-migrate --verbose
```

## Customize generation by providing custom CLI arguments

Custom CLI argments is allowed using CLI or prompts (using `--verbose`).

```sh
jhipster-migrate --target-cli-options "--db postgresql"
```

## Configuration changes

The upgrade process can be paused in the middle to allow you to change configurations like updating the database type. Usage:

```sh
jhipster-migrate --verbose
```

## 3-way merge diff

3-way merge diff is supported differently from `jhipster upgrade`.
It can be optionally enable using:

```sh
jhipster-migrate --verbose
```

## Package.json merge

A tool that merges `package.json` files can be optionally enabled using:

```sh
jhipster-migrate --verbose
```

[npm-image]: https://img.shields.io/npm/v/generator-jhipster-migrate.svg
[npm-url]: https://npmjs.org/package/generator-jhipster-migrate
[github-generator-image]: https://github.com/jhipster/generator-jhipster-migrate/actions/workflows/generator.yml/badge.svg
[github-generator-url]: https://github.com/jhipster/generator-jhipster-migrate/actions/workflows/generator.yml
[github-samples-image]: https://github.com/jhipster/generator-jhipster-migrate/actions/workflows/samples.yml/badge.svg
[github-samples-url]: https://github.com/jhipster/generator-jhipster-migrate/actions/workflows/samples.yml
