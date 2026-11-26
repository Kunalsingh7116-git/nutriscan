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
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sign in' })); });
  expect(screen.getByRole('status', { name: 'Opening your dashboard' })).toBeVisible();
  expect(container.querySelector('.session-pages')).toHaveAttribute('inert');
  act(() => jest.advanceTimersByTime(1300));
  expect(screen.queryByRole('status', { name: 'Opening your dashboard' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(container.querySelector('.session-pages')).not.toHaveAttribute('inert');
  jest.useRealTimers();
});

test('restoring an existing session does not replay the sign-in welcome', async () => {
  localStorage.setItem('ns_token', 'restored-token');
  render(<TestApp />);
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(screen.queryByRole('status', { name: 'Opening your dashboard' })).not.toBeInTheDocument();
});
