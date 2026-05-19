export class SignupDto {
  email!: string;
  password!: string;
  nickname!: string;
  agreements?: {
    serviceTermsAgreed?: boolean;
    privacyAgreed?: boolean;
    marketingAgreed?: boolean;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    kakaoEnabled?: boolean;
    recommendationEnabled?: boolean;
  };
}
