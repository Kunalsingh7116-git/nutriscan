import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MotionProvider } from '../hooks/useReducedMotion';
import AuthExperience from './AuthExperience';
import Login from '../pages/Login';
import Register from '../pages/Register';
import api from '../utils/api';

const mockLogin = jest.fn();
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ login: mockLogin }) }));
jest.mock('../utils/api', () => ({ post: jest.fn() }));
jest.mock('./GoogleSignIn', () => () => <button type="button">Continue with Google</button>);

let animations;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); mockLogin.mockClear(); api.post.mockReset();
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

test('signup sends only email first and requires the emailed code to create an account', async () => {
  const email = 'audit@example.test';
  const user = { name: { first: 'Audit' } };
  api.post.mockResolvedValueOnce({ status: 202 }).mockResolvedValueOnce({ data: { token: 'test-token', user } });
  render(<MotionProvider><MemoryRouter initialEntries={['/register']}><Routes>
    <Route path="/register" element={<Register />} /><Route path="/dashboard" element={<h1>Dashboard</h1>} />
  </Routes></MemoryRouter></MotionProvider>);
  const values = { 'First name': 'Audit', 'Last name': 'Example', Email: email, Password: 'synthetic-test-password', 'Date of birth': '1999-01-01' };
  for (const [label, value] of Object.entries(values)) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
  const code = await screen.findByLabelText('Verification code');
  expect(api.post).toHaveBeenNthCalledWith(1, '/auth/register/code', { email });
  expect(mockLogin).not.toHaveBeenCalled();
  fireEvent.change(code, { target: { value: '12345678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(api.post).toHaveBeenNthCalledWith(2, '/auth/register', expect.objectContaining({ email, code: '12345678' }));
});

test('password recovery sends a code before accepting a new password', async () => {
  const email = 'audit@example.test';
  api.post.mockResolvedValueOnce({ status: 202 }).mockResolvedValueOnce({ status: 204 });
  render(<MotionProvider><MemoryRouter><Login /></MemoryRouter></MotionProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Send recovery code' }));
  const code = await screen.findByLabelText('Verification code');
  fireEvent.change(code, { target: { value: '12345678' } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'synthetic-new-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
  expect(await screen.findByText('Your password was changed. Sign in with your new password.')).toBeVisible();
  expect(api.post).toHaveBeenNthCalledWith(1, '/auth/password-reset/code', { email });
  expect(api.post).toHaveBeenNthCalledWith(2, '/auth/password-reset', { email, password: 'synthetic-new-password', code: '12345678' });
});
