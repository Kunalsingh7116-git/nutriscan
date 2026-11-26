import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MotionProvider } from '../hooks/useReducedMotion';
import AuthExperience from './AuthExperience';
import Login from '../pages/Login';
import api from '../utils/api';

const mockLogin = jest.fn();
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ login: mockLogin }) }));
jest.mock('../utils/api', () => ({ post: jest.fn() }));
jest.mock('./GoogleSignIn', () => () => <button type="button">Continue with Google</button>);

let animations;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); mockLogin.mockClear();
  window.matchMedia = () => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  animations = [];
  Element.prototype.animate = jest.fn(() => {
    const animation = { finished: new Promise(() => {}), cancel: jest.fn() };
    animations.push(animation);
    return animation;
  });
});

test('reduced motion leaves sign-in immediately available', () => {
  render(<MotionProvider><AuthExperience><h1 tabIndex={-1}>Sign in</h1></AuthExperience></MotionProvider>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect(Element.prototype.animate).not.toHaveBeenCalled();
});

test('the logo welcome has no controls and automatically restores the form', () => {
  jest.useFakeTimers();
  localStorage.setItem('ns_motion', 'full');
  const { container } = render(<MotionProvider><AuthExperience><h1 tabIndex={-1}>Sign in</h1></AuthExperience></MotionProvider>);
  expect(screen.getByRole('status', { name: 'Welcome to NutriScan' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /skip|play welcome/i })).not.toBeInTheDocument();
  expect(container.querySelector('.auth-experience-content')).toHaveAttribute('inert');
  expect(document.body.style.overflow).toBe('hidden');
  act(() => jest.advanceTimersByTime(1500));
  expect(screen.queryByRole('status', { name: 'Welcome to NutriScan' })).not.toBeInTheDocument();
  expect(container.querySelector('.auth-experience-content')).not.toHaveAttribute('inert');
  expect(document.body.style.overflow).not.toBe('hidden');
  expect(animations).toHaveLength(3);
  animations.forEach(animation => expect(animation.cancel).toHaveBeenCalled());
  expect(sessionStorage.getItem('ns_auth_logo_welcome_seen')).toBe('1');
  jest.useRealTimers();
});

test('the restored form submits the same credentials and completes sign-in', async () => {
  const user = { name: { first: 'Test' } };
  api.post.mockResolvedValue({ data: { token: 'test-token', user } });
  render(<MotionProvider><MemoryRouter initialEntries={['/login']}><Routes>
    <Route path="/login" element={<Login />} /><Route path="/dashboard" element={<h1>Dashboard</h1>} />
  </Routes></MemoryRouter></MotionProvider>);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'example-password' } });
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  fireEvent.click(screen.getByRole('button', { name: 'Sign In', exact: true }));
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'test@example.com', password: 'example-password' });
  expect(mockLogin).toHaveBeenCalledWith('test-token', user);
});
