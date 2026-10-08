
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import AuthModal from './AuthModal'

const renderAuthModal = () => {
  render(
    <AuthModal
      isOpen={true}
      onClose={vi.fn()}
      apiBaseUrl="http://localhost:5187/api"
      onLoginSuccess={vi.fn()}
    />
  )
}

describe('AuthModal - React Component Tests', () => {

  test('should display login form when modal is opened', () => {
    renderAuthModal()

    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('name@example.com')
    ).toBeInTheDocument()

    const signInButtons = screen.getAllByRole('button', {
      name: 'Sign In'
    })

    expect(signInButtons.length).toBe(2)
  })

  test('should prevent login when email and password are empty', () => {
    renderAuthModal()

    const signInButtons = screen.getAllByRole('button', {
      name: 'Sign In'
    })

    // The second "Sign In" button is the form submit button
    const submitButton = signInButtons[1]

    fireEvent.click(submitButton)

    expect(
      screen.getByPlaceholderText('name@example.com')
    ).toBeInvalid()
  })

  test('should toggle password visibility', () => {
    renderAuthModal()

    const passwordInput = screen.getByPlaceholderText('••••••••')

    const toggleButton = screen.getByRole('button', {
      name: 'Toggle password visibility'
    })

    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(toggleButton)

    expect(passwordInput).toHaveAttribute('type', 'text')
  })

})
