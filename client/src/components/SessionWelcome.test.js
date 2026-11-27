import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { MotionProvider } from '../hooks/useReducedMotion';
import SessionWelcome from './SessionWelcome';
jest.mock('../utils/routeLoaders', () => ({ preloadRoute: jest.fn() }));
jest.mock('axios', () => ({ defaults: { headers: { common: {} } }, get: jest.fn() }));
const user = { name: { first: 'Demo' } };
function TestPage() {
  const { user: current, login } = useAuth();
  return current ? <h1>Dashboard</h1> : <button onClick={() => login('demo-token', user)}>Sign in</button>;
}
function TestApp() { return <MotionProvider><AuthProvider><SessionWelcome><TestPage /></SessionWelcome></AuthProvider></MotionProvider>; }
async function advance(ms) { await act(async () => jest.advanceTimersByTime(ms)); }
beforeEach(() => {
  jest.useFakeTimers(); localStorage.clear(); sessionStorage.clear();
  window.matchMedia = () => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  axios.get.mockResolvedValue({ data: user });
  Element.prototype.animate = jest.fn((frames, options) => {
    let timer;
    const finished = new Promise(resolve => { timer = setTimeout(resolve, (options.delay || 0) + options.duration); });
    return { finished, cancel: () => clearTimeout(timer) };
  });
});
afterEach(() => { jest.useRealTimers(); });
test('a fresh opening keeps the original welcome visible for 2.5 seconds', async () => {
  const { container } = render(<TestApp />);
  expect(screen.getByRole('status', { name: 'Welcome to NutriScan' })).toBeVisible();
  expect(container.querySelector('.session-pages')).toHaveAttribute('inert');
  await advance(2000);
  expect(screen.getByRole('status', { name: 'Welcome to NutriScan' })).toBeVisible();
  await advance(500);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(container.querySelector('.session-pages')).not.toHaveAttribute('inert');
});
test('background return and back-forward cache restore do not replay the welcome', async () => {
  render(<TestApp />); await advance(2500);
  const hidden = jest.spyOn(document, 'hidden', 'get');
  hidden.mockReturnValue(true); fireEvent(document, new Event('visibilitychange'));
  hidden.mockReturnValue(false); fireEvent(document, new Event('visibilitychange'));
  const restore = new Event('pageshow'); Object.defineProperty(restore, 'persisted', { value: true });
  fireEvent(window, restore);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  hidden.mockRestore();
});
test('signing in does not trigger a second welcome', async () => {
  render(<TestApp />); await advance(2500);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
test('a genuinely new app mount plays the welcome again', async () => {
  const first = render(<TestApp />); await advance(2500); first.unmount();
  render(<TestApp />);
  expect(screen.getByRole('status', { name: 'Welcome to NutriScan' })).toBeVisible();
});
test('reduced motion skips the welcome immediately', () => {
  window.matchMedia = () => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  render(<TestApp />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
test('a stalled animation releases the page through its safety timeout', async () => {
  Element.prototype.animate = jest.fn(() => ({ finished: new Promise(() => {}), cancel: jest.fn() }));
  render(<TestApp />); await advance(2700);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
