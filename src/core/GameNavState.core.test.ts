import { describe, expect, test, beforeEach } from 'bun:test';
import {
  currentBackContext,
  navEnterCreate,
  navEnterPlay,
  navEnterTitle,
  navResetForTests,
  navSetOverlay,
  navSetPaused,
} from './GameNavState';

describe('currentBackContext', () => {
  beforeEach(() => navResetForTests());

  test('title phase', () => {
    navEnterTitle();
    expect(currentBackContext()).toBe('title');
  });

  test('title settings/slots act as overlay', () => {
    navEnterTitle();
    navSetOverlay(true);
    expect(currentBackContext()).toBe('overlay');
  });

  test('create maps to overlay', () => {
    navEnterCreate();
    expect(currentBackContext()).toBe('overlay');
  });

  test('play with overlay beats pause', () => {
    navEnterPlay();
    navSetPaused(true);
    navSetOverlay(true);
    expect(currentBackContext()).toBe('overlay');
  });

  test('play paused', () => {
    navEnterPlay();
    navSetPaused(true);
    expect(currentBackContext()).toBe('paused');
  });

  test('play default', () => {
    navEnterPlay();
    expect(currentBackContext()).toBe('playing');
  });
});
