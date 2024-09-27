import { readFile } from 'fs/promises';
import assert from 'yeoman-assert';
import { beforeAll, describe, expect, it } from 'vitest';
import simpleGit from 'simple-git';
import { escapeRegExp } from 'lodash-es';

import { basicHelpers as helpers } from 'generator-jhipster/testing';

/**
 * @return {import('simple-git').SimpleGit}
 */
const createGit = () => simpleGit().env('LANG', 'en');

const SUB_GENERATOR = 'migrate';
const SUB_GENERATOR_NAMESPACE = `jhipster-migrate:${SUB_GENERATOR}`;

describe('SubGenerator migrate of migrate JHipster blueprint', () => {
  describe('default application', () => {
    beforeAll(async () => {
      const context = await helpers
        .runJHipster('app')
        .withJHipsterConfig({
          baseName: 'upgradeTest',
          skipCommitHook: true,
          skipClient: true,
          skipServer: true,
        })
        .withParentBlueprintLookup();

      await context
        .create(SUB_GENERATOR_NAMESPACE)
        .withOptions({
          sourceVersion: 'bundled',
          targetVersion: 'bundled',
        })
        .withParentBlueprintLookup();
    });

    it(
      'generated git commits to match snapshot',
      {
        // Git order is not always the same.
        retry: 5,
      },
      async () => {
        const git = createGit();
        const log = await git.log();
        const { version } = JSON.parse(await readFile(new URL('../../node_modules/generator-jhipster/package.json', import.meta.url)));
        expect(
          log.all
            .map(commit => commit.message)
            .join('\n')
            .replace(new RegExp(escapeRegExp(version), 'g'), 'VERSION'),
        ).toMatchInlineSnapshot(`
          "merging jhipster_migrate_target into application
          apply updated prettier to target application
          migration application generated with JHipster bundled (target)
          initial merge of jhipster_migrate_source branch into application
          apply actual application to migration branch
          apply updated prettier to actual application
          apply updated prettier to source application
          migration application generated with JHipster bundled (source)
          initial"
        `);
      },
    );

    it('generated branches to match snapshot', async () => {
      expect((await createGit().branchLocal()).all).toMatchInlineSnapshot(`
        [
          "jhipster_migrate_source",
          "jhipster_migrate_target",
          "main",
        ]
      `);
    });
    it('generates expected number of commits', async () => {
      expect((await createGit().log()).total).toBe(9);
    });
    it('should remove file from updated config', async () => {
      assert.noFile('.lintstagedrc.js');
    });
  });
});
