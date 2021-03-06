const path = require('path');
const {
  getShorthandString,
  parseRepository,
  getRepositoryFromPackage,
  getRepositoryFromGit,
  getRepositoryFromStringOrEnv,
  getRepository
} = require('../lib/repo');

jest.mock('execa');
jest.mock('hasbin');

const resetEnv = () => {
  process.env.DEVTO_REPO = undefined;
};

const resetCwd = () => process.chdir(path.join(__dirname, '..'));

describe('repository methods', () => {
  describe('getShorthandString', () => {
    it('should return shorthand string', () => {
      expect(getShorthandString({ user: 'user', name: 'repo' })).toEqual('user/repo');
    });
  });

  describe('parseRepository', () => {
    it('should return null', () => {
      expect(parseRepository()).toBe(null);
      expect(parseRepository('not-a-repo')).toBe(null);
    });

    it('should parse http repo', () => {
      expect(parseRepository('https://github.com/sinedied/devto-cli.git')).toEqual({
        user: 'sinedied',
        name: 'devto-cli'
      });
    });

    it('should parse git repo', () => {
      expect(parseRepository('git@github.com:sinedied/devto-cli.git')).toEqual({
        user: 'sinedied',
        name: 'devto-cli'
      });
    });

    it('should parse shorthand repo', () => {
      expect(parseRepository('sinedied/devto-cli')).toEqual({ user: 'sinedied', name: 'devto-cli' });
    });
  });

  describe('getRepositoryFromPackage', () => {
    beforeEach(resetCwd);
    afterEach(resetCwd);

    it('should get repo from same dir', async () => {
      expect(await getRepositoryFromPackage()).toEqual({ user: 'sinedied', name: 'devto-cli' });
    });

    it('should not get repo from child dir', async () => {
      process.chdir('test');
      expect(await getRepositoryFromPackage(false)).toEqual(null);
    });

    it('should get repo from child dir', async () => {
      process.chdir('test');
      expect(await getRepositoryFromPackage(true)).toEqual({ user: 'sinedied', name: 'devto-cli' });
    });
  });

  describe('getRepositoryFromGit', () => {
    it('should return null if git is not installed', async () => {
      const hasbin = require('hasbin');
      hasbin.mockImplementation((_, cb) => cb(false));

      expect(await getRepositoryFromGit()).toBe(null);
    });

    it('should return null if git returned an error', async () => {
      const hasbin = require('hasbin');
      const execa = require('execa');
      hasbin.mockImplementation((_, cb) => cb(true));
      execa.mockImplementation(() => {
        throw new Error('git error');
      });

      expect(await getRepositoryFromGit()).toBe(null);
    });

    it('should get repo from git', async () => {
      const hasbin = require('hasbin');
      const execa = require('execa');
      hasbin.mockImplementation((_, cb) => cb(true));
      execa.mockImplementation(async () => ({ stdout: 'git@github.com:user/repo.git' }));

      expect(await getRepositoryFromGit()).toEqual({ user: 'user', name: 'repo' });
    });
  });

  describe('getRepositoryFromStringOrEnv', () => {
    beforeEach(resetEnv);
    afterEach(resetEnv);

    it('should get repo from string', () => {
      expect(getRepositoryFromStringOrEnv('user/repo')).toEqual({ user: 'user', name: 'repo' });
    });

    it('should get repo from env', () => {
      process.env.DEVTO_REPO = 'user/repo';
      expect(getRepositoryFromStringOrEnv()).toEqual({ user: 'user', name: 'repo' });
    });

    it('should return null', () => {
      process.env.DEVTO_REPO = 'garbage';
      expect(getRepositoryFromStringOrEnv('garbage')).toBe(null);
      expect(getRepositoryFromStringOrEnv()).toBe(null);
    });
  });

  describe('getRepository', () => {
    beforeEach(() => resetEnv(), resetCwd());
    afterEach(() => resetEnv(), resetCwd());

    it('should get repo from string', async () => {
      expect(await getRepository('user/repo')).toEqual({ user: 'user', name: 'repo' });
    });

    it('should get repo from env', async () => {
      process.env.DEVTO_REPO = 'user/repo';
      expect(await getRepository()).toEqual({ user: 'user', name: 'repo' });
    });

    it('should get repo from git', async () => {
      const hasbin = require('hasbin');
      const execa = require('execa');
      hasbin.mockImplementation((_, cb) => cb(true));
      execa.mockImplementation(async () => ({ stdout: 'git@github.com:user/repo.git' }));

      expect(await getRepository()).toEqual({ user: 'user', name: 'repo' });
    });

    it('should get repo from package', async () => {
      const hasbin = require('hasbin');
      hasbin.mockImplementation((_, cb) => cb(false));

      expect(await getRepository('')).toEqual({ user: 'sinedied', name: 'devto-cli' });
    });

    it('should return null', async () => {
      const hasbin = require('hasbin');
      hasbin.mockImplementation((_, cb) => cb(false));
      process.chdir('test');

      expect(await getRepository('garbage', false)).toBe(null);
      expect(await getRepository(null, false)).toBe(null);
    });
  });
});
