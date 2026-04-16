import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  async login(loginDto: LoginDto) {
    // Implement login logic
    return { message: 'Login successful' };
  }

  async signup(signupDto: SignupDto) {
    // Implement signup logic
    return { message: 'Signup successful' };
  }
}