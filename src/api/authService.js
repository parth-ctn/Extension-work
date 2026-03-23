import { post } from './httpClient.js';

export const authService = {
  signUp: (payload) => post('register/', payload),
  signUpWithGoogle: (payload) => post('signup-with-google/', payload),
  login: (payload) => post('login/', payload),
  verifyOtp: (payload) => post('verify-otp', payload),
  resendOtp: (payload) => post('resend/otp/', payload),
  checkEmail: (payload, options) => post('check-email/', payload, options),
  checkUsername: (username, options) => post('check-username/', { username }, options),
  joinWaitList: (payload) => post('plans/join-waitlist/', payload),
  checkWaitList: (payload) => post('plans/check-waitlist/', payload)
};
