import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { MotionProvider } from '../hooks/useReducedMotion';
import SessionWelcome from './SessionWelcome';

jest.mock('axios', () => ({ defaults: { headers: { common: {} } }, get: jest.fn() }));
const user = { name: { first: 'Demo' } };
function TestPage() {
  const { user: current, login } = useAuth();
  return current ? <h1>Dashboard</h1> : <button onClick={() => login('demo-token', user)}>Sign in</button>;
}
function TestApp() {
  return <MotionProvider><AuthProvider><SessionWelcome><TestPage /></SessionWelcome></AuthProvider></MotionProvider>;
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  window.matchMedia = () => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  axios.get.mockResolvedValue({ data: user });
  Element.prototype.animate = jest.fn(() => ({ finished: new Promise(() => {}), cancel: jest.fn() }));
});

test('fresh successful authentication plays the logo welcome before enabling the dashboard', async () => {
  jest.useFakeTimers();
  const { container } = render(<TestApp />);
  act(() => jest.advanceTimersByTime(1500));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sign in' })); });
  expect(screen.getByRole('status', { name: 'Opening your dashboard' })).toBeVisible();
  expect(container.querySelector('.session-pages')).toHaveAttribute('inert');
  act(() => jest.advanceTimersByTime(1300));
  expect(screen.queryByRole('status', { name: 'Opening your dashboard' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(container.querySelector('.session-pages')).not.toHaveAttribute('inert');
  jest.useRealTimers();
});

test('opening with an existing session plays the app welcome and then reveals the dashboard', async () => {
  jest.useFakeTimers();
  localStorage.setItem('ns_token', 'restored-token');
  render(<TestApp />);
  expect(screen.getByRole('status', { name: 'Welcome to NutriScan' })).toBeVisible();
  await act(async () => { jest.advanceTimersByTime(1500); });
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(screen.queryByRole('status', { name: 'Opening your dashboard' })).not.toBeInTheDocument();
  jest.useRealTimers();
});

test('welcome replays on a new app mount and on return from the background', () => {
  jest.useFakeTimers();
  const first = render(<TestApp />);
  expect(screen.queryByRole('button', { name: /skip|play welcome/i })).not.toBeInTheDocument();
  act(() => jest.advanceTimersByTime(1500));
  first.unmount();
  const second = render(<TestApp />);
  expect(screen.getByRole('status', { name: 'Welcome to NutriScan' })).toBeVisible();
  act(() => jest.advanceTimersByTime(1500));
  const hidden = jest.spyOn(document, 'hidden', 'get');
  hidden.mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  hidden.mockReturnValue(false);
  fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByRole('status', { name: 'Welcome to NutriScan' })).toBeVisible();
  act(() => jest.advanceTimersByTime(1500));
  expect(second.container.querySelector('.session-pages')).not.toHaveAttribute('inert');
  hidden.mockRestore();
  jest.useRealTimers();
});
