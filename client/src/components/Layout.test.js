import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { lazy } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import api from '../utils/api';

jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { name: { first: 'Demo' } }, logout: jest.fn() }) }));
jest.mock('../utils/api', () => ({ get: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock('../utils/routeLoaders', () => ({ preloadRoute: jest.fn() }));
jest.mock('../hooks/useReducedMotion', () => () => true);

test('navigation and workspace stay available while a route is downloading', async () => {
  api.get.mockResolvedValue({ data: [] });
  let finishImport;
  const PendingPage = lazy(() => new Promise(resolve => { finishImport = resolve; }));
  window.scrollTo = jest.fn();
  render(<MemoryRouter initialEntries={['/profile']}><Routes>
    <Route element={<Layout />}><Route path="/profile" element={<PendingPage />} /></Route>
  </Routes></MemoryRouter>);
  expect(screen.getByRole('navigation', { name: 'Desktop navigation' })).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  expect(screen.getByRole('status', { name: 'Opening page' })).toBeInTheDocument();
  await act(async () => { finishImport({ default: () => <h1>Your profile</h1> }); });
  expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeVisible();
  expect(screen.queryByRole('status', { name: 'Opening page' })).not.toBeInTheDocument();
});
