import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class AuthModal extends StatefulWidget {
  final VoidCallback? onLoginSuccess;
  final String initialMode;

  const AuthModal({
    super.key,
    this.onLoginSuccess,
    this.initialMode = 'login',
  });

  static Future<void> show(
    BuildContext context, {
    VoidCallback? onLoginSuccess,
    String initialMode = 'login',
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierColor: const Color(0xBF0F172A), // rgba(15, 23, 42, 0.75)
      builder: (ctx) => AuthModal(
        onLoginSuccess: onLoginSuccess,
        initialMode: initialMode,
      ),
    );
  }

  @override
  State<AuthModal> createState() => _AuthModalState();
}

class _AuthModalState extends State<AuthModal> {
  final ApiService _apiService = ApiService();

  late String _authMode; // 'login' | 'register' | 'verify-otp' | 'forgot-password'
  String? _feedbackType; // 'error' | 'success' | 'info'
  String? _feedbackText;
  bool _loading = false;

  // Login form controllers
  final _emailController = TextEditingController(text: 'member@smartsports.com');
  final _passwordController = TextEditingController();
  bool _showPassword = false;

  // Register form controllers
  final _fullNameController = TextEditingController();
  final _registerEmailController = TextEditingController();
  final _contactNumberController = TextEditingController();
  final _nicNumberController = TextEditingController();
  final _registerPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _showRegisterPassword = false;

  // Verify OTP form controllers
  String _otpPendingEmail = '';
  final _otpController = TextEditingController();
  String? _devOtp;

  // Forgot password controllers
  int _forgotStep = 1; // 1: request OTP, 2: reset
  final _forgotEmailController = TextEditingController();
  final _forgotOtpController = TextEditingController();
  final _forgotNewPwController = TextEditingController();
  final _forgotConfirmPwController = TextEditingController();
  bool _showForgotPw = false;
  String? _devForgotOtp;

  @override
  void initState() {
    super.initState();
    _authMode = widget.initialMode;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _fullNameController.dispose();
    _registerEmailController.dispose();
    _contactNumberController.dispose();
    _nicNumberController.dispose();
    _registerPasswordController.dispose();
    _confirmPasswordController.dispose();
    _otpController.dispose();
    _forgotEmailController.dispose();
    _forgotOtpController.dispose();
    _forgotNewPwController.dispose();
    _forgotConfirmPwController.dispose();
    super.dispose();
  }

  void _setFeedback(String? type, String? text) {
    if (!mounted) return;
    setState(() {
      _feedbackType = type;
      _feedbackText = text;
    });
  }

  // ----------------------------------------------------
  // LOGIN LOGIC
  // ----------------------------------------------------
  Future<void> _handleLoginSubmit() async {
    _setFeedback(null, null);
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      _setFeedback('error', 'Please enter both your email and password.');
      return;
    }

    setState(() => _loading = true);
    try {
      await _apiService.login(email, password);
      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onLoginSuccess?.call();
    } catch (e) {
      _setFeedback('error', e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _quickFill(String email, String password) {
    _emailController.text = email;
    _passwordController.text = password;
    _handleLoginSubmit();
  }

  // ----------------------------------------------------
  // REGISTER LOGIC
  // ----------------------------------------------------
  Future<void> _handleRegisterSubmit() async {
    _setFeedback(null, null);
    final fullName = _fullNameController.text.trim();
    final email = _registerEmailController.text.trim();
    final contact = _contactNumberController.text.trim();
    final nic = _nicNumberController.text.trim();
    final password = _registerPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (fullName.isEmpty || email.isEmpty || contact.isEmpty || nic.isEmpty || password.isEmpty) {
      _setFeedback('error', 'Please complete all required fields.');
      return;
    }

    if (!RegExp(r'^\d{10}$').hasMatch(contact)) {
      _setFeedback('error', 'Contact number must be exactly 10 digits.');
      return;
    }

    if (!RegExp(r'^(\d{9}[vVxX]|\d{12})$').hasMatch(nic)) {
      _setFeedback('error', 'NIC must be 12 digits or 9 digits followed by V or X.');
      return;
    }

    if (password.length < 8) {
      _setFeedback('error', 'Password must be at least 8 characters long.');
      return;
    }

    if (password != confirmPassword) {
      _setFeedback('error', 'Passwords do not match.');
      return;
    }

    setState(() => _loading = true);
    try {
      final res = await _apiService.register(
        fullName: fullName,
        email: email,
        contactNumber: contact,
        nicNumber: nic,
        password: password,
      );

      final cleanEmail = email.trim().replaceAll(RegExp(r'\.+$'), '');
      _otpPendingEmail = cleanEmail.toLowerCase();
      final devOtp = res['devOtp']?.toString();
      _devOtp = devOtp;
      if (devOtp != null && devOtp.isNotEmpty) {
        _otpController.text = devOtp;
        _setFeedback('info', 'Verification code generated: $devOtp (auto-filled below).');
      } else {
        _otpController.clear();
        _setFeedback('success', 'Verification code sent to "$cleanEmail" — check your inbox!');
      }

      setState(() => _authMode = 'verify-otp');
    } catch (e) {
      _setFeedback('error', e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ----------------------------------------------------
  // VERIFY OTP LOGIC
  // ----------------------------------------------------
  Future<void> _handleVerifyOtpSubmit() async {
    _setFeedback(null, null);
    final otp = _otpController.text.trim();

    if (otp.length != 6) {
      _setFeedback('error', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setState(() => _loading = true);
    try {
      await _apiService.verifyOtp(_otpPendingEmail, otp);
      _emailController.text = _otpPendingEmail;
      _passwordController.clear();
      _setFeedback('success', 'Account verified successfully! Please sign in below.');
      setState(() => _authMode = 'login');
    } catch (e) {
      _setFeedback('error', e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ----------------------------------------------------
  // FORGOT PASSWORD LOGIC
  // ----------------------------------------------------
  Future<void> _handleForgotPasswordRequest() async {
    _setFeedback(null, null);
    final email = _forgotEmailController.text.trim();

    if (email.isEmpty) {
      _setFeedback('error', 'Please enter your registered account email.');
      return;
    }

    setState(() => _loading = true);
    try {
      final cleanForgotEmail = email.trim().replaceAll(RegExp(r'\.+$'), '');
      final res = await _apiService.forgotPassword(cleanForgotEmail);
      final devOtp = res['devOtp']?.toString();
      _devForgotOtp = devOtp;
      if (devOtp != null && devOtp.isNotEmpty) {
        _forgotOtpController.text = devOtp;
        _setFeedback('info', 'Recovery code: $devOtp (auto-filled below).');
      } else {
        _setFeedback('success', 'A 6-digit recovery code was sent to "$cleanForgotEmail" — check your inbox!');
      }
      setState(() => _forgotStep = 2);
    } catch (e) {
      _setFeedback('error', e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleResetPasswordSubmit() async {
    _setFeedback(null, null);
    final email = _forgotEmailController.text.trim();
    final otp = _forgotOtpController.text.trim();
    final newPw = _forgotNewPwController.text;
    final confirmPw = _forgotConfirmPwController.text;

    if (otp.length != 6) {
      _setFeedback('error', 'Please enter the 6-digit recovery code.');
      return;
    }

    if (newPw.length < 8) {
      _setFeedback('error', 'New password must be at least 8 characters long.');
      return;
    }

    if (newPw != confirmPw) {
      _setFeedback('error', 'New passwords do not match.');
      return;
    }

    setState(() => _loading = true);
    try {
      await _apiService.resetPassword(email: email, otp: otp, newPassword: newPw);
      _emailController.text = email;
      _passwordController.clear();
      _setFeedback('success', 'Password reset successful! Sign in with your new password.');
      setState(() {
        _authMode = 'login';
        _forgotStep = 1;
      });
    } catch (e) {
      _setFeedback('error', e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480, maxHeight: 720),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x400F172A),
                  blurRadius: 32,
                  offset: Offset(0, 16),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Top Header with Brand & Close Button
                    _buildHeader(),
                    const SizedBox(height: 18),

                    // Auth Mode Tabs (Sign In / Register)
                    if (_authMode == 'login' || _authMode == 'register') ...[
                      _buildTabSwitcher(),
                      const SizedBox(height: 18),
                    ],

                    // Feedback Alert Banner
                    if (_feedbackText != null) ...[
                      _buildAlertBanner(),
                      const SizedBox(height: 16),
                    ],

                    // Mode Views
                    if (_authMode == 'login') _buildLoginForm(),
                    if (_authMode == 'register') _buildRegisterForm(),
                    if (_authMode == 'verify-otp') _buildVerifyOtpForm(),
                    if (_authMode == 'forgot-password') _buildForgotPasswordForm(),

                    const SizedBox(height: 20),

                    // Professional Guest Browsing Footer
                    _buildGuestFooter(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ----------------------------------------------------
  // HEADER
  // ----------------------------------------------------
  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF2DD4BF), AppTheme.primary],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Text(
                  'S',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 20,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0x1A10B981), // rgba(16, 185, 129, 0.1)
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0x4010B981)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('🔒', style: TextStyle(fontSize: 11)),
                  SizedBox(width: 4),
                  Text(
                    'Secure Member Access',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF059669),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        // Close Button
        InkWell(
          onTap: () => Navigator.of(context).pop(),
          borderRadius: BorderRadius.circular(20),
          child: Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0x3394A3B8)),
            ),
            child: const Center(
              child: Text(
                '✕',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF64748B),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ----------------------------------------------------
  // TAB SWITCHER
  // ----------------------------------------------------
  Widget _buildTabSwitcher() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () {
                setState(() => _authMode = 'login');
                _setFeedback(null, null);
              },
              borderRadius: BorderRadius.circular(9),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: BoxDecoration(
                  color: _authMode == 'login' ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: _authMode == 'login'
                      ? const [
                          BoxShadow(
                            color: Color(0x14000000),
                            blurRadius: 6,
                            offset: Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  'Sign In',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: _authMode == 'login' ? const Color(0xFF0284C7) : const Color(0xFF64748B),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: InkWell(
              onTap: () {
                setState(() => _authMode = 'register');
                _setFeedback(null, null);
              },
              borderRadius: BorderRadius.circular(9),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: BoxDecoration(
                  color: _authMode == 'register' ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: _authMode == 'register'
                      ? const [
                          BoxShadow(
                            color: Color(0x14000000),
                            blurRadius: 6,
                            offset: Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  'Register Account',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: _authMode == 'register' ? const Color(0xFF0284C7) : const Color(0xFF64748B),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------------
  // ALERT BANNER
  // ----------------------------------------------------
  Widget _buildAlertBanner() {
    Color bg;
    Color border;
    Color text;
    String icon;

    switch (_feedbackType) {
      case 'success':
        bg = const Color(0xFFF0FDF4);
        border = const Color(0xFFBBF7D0);
        text = const Color(0xFF16A34A);
        icon = '✅';
        break;
      case 'info':
        bg = const Color(0xFFF0F9FF);
        border = const Color(0xFFBAE6FD);
        text = const Color(0xFF0284C7);
        icon = 'ℹ️';
        break;
      case 'error':
      default:
        bg = const Color(0xFFFEF2F2);
        border = const Color(0xFFFECACA);
        text = const Color(0xFFDC2626);
        icon = '⚠️';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(icon, style: const TextStyle(fontSize: 14)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _feedbackText ?? '',
              style: TextStyle(fontSize: 12.5, color: text, fontWeight: FontWeight.w600, height: 1.3),
            ),
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------------
  // 1. SIGN IN FORM
  // ----------------------------------------------------
  Widget _buildLoginForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Welcome Back',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            letterSpacing: -0.4,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Sign in to manage court reservations and athlete support.',
          style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 18),

        // Email
        _buildFieldLabel('Email Address'),
        const SizedBox(height: 6),
        _buildInput(
          controller: _emailController,
          glyph: '✉️',
          hintText: 'name@example.com',
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 14),

        // Password & Forgot Link
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildFieldLabel('Password'),
            InkWell(
              onTap: () {
                setState(() {
                  _authMode = 'forgot-password';
                  _forgotStep = 1;
                  _forgotEmailController.text = _emailController.text;
                });
                _setFeedback(null, null);
              },
              child: const Text(
                'Forgot password?',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0284C7),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        _buildInput(
          controller: _passwordController,
          glyph: '🔑',
          hintText: '••••••••',
          obscureText: !_showPassword,
          suffixIcon: IconButton(
            icon: Text(_showPassword ? '🙈' : '👁️', style: const TextStyle(fontSize: 15)),
            onPressed: () => setState(() => _showPassword = !_showPassword),
          ),
        ),
        const SizedBox(height: 18),

        // Sign In Button
        _buildPrimaryButton(
          title: 'Sign In',
          loadingTitle: 'Authenticating...',
          onPressed: _loading ? null : _handleLoginSubmit,
        ),
        const SizedBox(height: 16),

        // Quick Demo Accounts
        const Text(
          'Quick Demo Accounts:',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildDemoChip(
                label: 'Admin',
                onTap: () => _quickFill('admin@smartsports.com', 'admin123'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildDemoChip(
                label: 'Manager',
                onTap: () => _quickFill('manager@smartsports.com', 'manager123'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildDemoChip(
                label: 'Member',
                onTap: () => _quickFill('member@smartsports.com', 'member123'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ----------------------------------------------------
  // 2. REGISTER FORM
  // ----------------------------------------------------
  Widget _buildRegisterForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Create Account',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            letterSpacing: -0.4,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Join MySpot for instant bookings and athlete privileges.',
          style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 16),

        // Full Name
        _buildFieldLabel('Full Name'),
        const SizedBox(height: 6),
        _buildInput(
          controller: _fullNameController,
          glyph: '👤',
          hintText: 'Aisha Jordan',
        ),
        const SizedBox(height: 12),

        // Email
        _buildFieldLabel('Email Address'),
        const SizedBox(height: 6),
        _buildInput(
          controller: _registerEmailController,
          glyph: '✉️',
          hintText: 'name@example.com',
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 12),

        // Phone & NIC in a row
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('Contact Phone'),
                  const SizedBox(height: 6),
                  _buildInput(
                    controller: _contactNumberController,
                    glyph: '📞',
                    hintText: '0771234567',
                    keyboardType: TextInputType.phone,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(10),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('NIC Number'),
                  const SizedBox(height: 6),
                  _buildInput(
                    controller: _nicNumberController,
                    glyph: '🪪',
                    hintText: '123456789V',
                    inputFormatters: [LengthLimitingTextInputFormatter(12)],
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Password
        _buildFieldLabel('Password'),
        const SizedBox(height: 6),
        _buildInput(
          controller: _registerPasswordController,
          glyph: '🔑',
          hintText: '8+ chars (A-Z, a-z, 0-9, symbol)',
          obscureText: !_showRegisterPassword,
          suffixIcon: IconButton(
            icon: Text(_showRegisterPassword ? '🙈' : '👁️', style: const TextStyle(fontSize: 15)),
            onPressed: () => setState(() => _showRegisterPassword = !_showRegisterPassword),
          ),
        ),
        const SizedBox(height: 12),

        // Confirm Password
        _buildFieldLabel('Confirm Password'),
        const SizedBox(height: 6),
        _buildInput(
          controller: _confirmPasswordController,
          glyph: '🔒',
          hintText: 'Re-enter password',
          obscureText: !_showRegisterPassword,
        ),
        const SizedBox(height: 18),

        // Send Verification Code Button
        _buildPrimaryButton(
          title: 'Send Verification Code',
          loadingTitle: 'Sending Verification Code...',
          onPressed: _loading ? null : _handleRegisterSubmit,
        ),
      ],
    );
  }

  // ----------------------------------------------------
  // 3. VERIFY OTP FORM
  // ----------------------------------------------------
  Widget _buildVerifyOtpForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Verify Your Email',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            letterSpacing: -0.4,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Enter the 6-digit code sent to $_otpPendingEmail.',
          style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 20),

        if (_devOtp != null)
          Container(
            padding: const EdgeInsets.all(10),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: AppTheme.warningBg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFFCD34D)),
            ),
            child: Text(
              'Dev OTP: $_devOtp (auto-filled)',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: AppTheme.warningDark,
                fontSize: 13,
              ),
            ),
          ),

        const Text(
          '6-Digit Verification Code',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
        ),
        const SizedBox(height: 8),

        TextField(
          controller: _otpController,
          textAlign: TextAlign.center,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(6),
          ],
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w900,
            letterSpacing: 10,
            color: Color(0xFF0369A1),
          ),
          decoration: InputDecoration(
            hintText: '••••••',
            filled: true,
            fillColor: const Color(0xFFF0F9FF),
            contentPadding: const EdgeInsets.symmetric(vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFF0284C7), width: 2),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFF0284C7), width: 2),
            ),
          ),
        ),
        const SizedBox(height: 18),

        _buildPrimaryButton(
          title: 'Verify & Complete Registration',
          loadingTitle: 'Verifying Account...',
          onPressed: _loading ? null : _handleVerifyOtpSubmit,
        ),
        const SizedBox(height: 12),

        TextButton(
          onPressed: () {
            setState(() => _authMode = 'register');
            _setFeedback(null, null);
          },
          child: const Text(
            '← Back to Registration Details',
            style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600, fontSize: 13),
          ),
        ),
      ],
    );
  }

  // ----------------------------------------------------
  // 4. FORGOT PASSWORD WORKFLOW
  // ----------------------------------------------------
  Widget _buildForgotPasswordForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Reset Password',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            letterSpacing: -0.4,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          _forgotStep == 1
              ? 'Enter your registered email and we will send a 6-digit recovery code.'
              : 'Enter the 6-digit recovery code sent to ${_forgotEmailController.text.trim()} and choose a new password.',
          style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 18),

        if (_forgotStep == 1) ...[
          _buildFieldLabel('Registered Account Email'),
          const SizedBox(height: 6),
          _buildInput(
            controller: _forgotEmailController,
            glyph: '✉️',
            hintText: 'name@example.com',
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 18),
          _buildPrimaryButton(
            title: 'Send Recovery Code',
            loadingTitle: 'Sending Recovery Code...',
            onPressed: _loading ? null : _handleForgotPasswordRequest,
          ),
        ] else ...[
          if (_devForgotOtp != null)
            Container(
              padding: const EdgeInsets.all(10),
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                color: AppTheme.warningBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFCD34D)),
              ),
              child: Text(
                'Recovery Code: $_devForgotOtp (auto-filled)',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppTheme.warningDark,
                  fontSize: 13,
                ),
              ),
            ),

          const Text(
            '6-Digit Recovery Code',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _forgotOtpController,
            textAlign: TextAlign.center,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(6),
            ],
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              letterSpacing: 8,
              color: Color(0xFF0369A1),
            ),
            decoration: InputDecoration(
              hintText: '••••••',
              filled: true,
              fillColor: const Color(0xFFF0F9FF),
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF0284C7), width: 2),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF0284C7), width: 2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          _buildFieldLabel('New Password'),
          const SizedBox(height: 6),
          _buildInput(
            controller: _forgotNewPwController,
            glyph: '🔑',
            hintText: '8+ chars, uppercase, lowercase & symbol',
            obscureText: !_showForgotPw,
            suffixIcon: IconButton(
              icon: Text(_showForgotPw ? '🙈' : '👁️', style: const TextStyle(fontSize: 15)),
              onPressed: () => setState(() => _showForgotPw = !_showForgotPw),
            ),
          ),
          const SizedBox(height: 12),

          _buildFieldLabel('Confirm New Password'),
          const SizedBox(height: 6),
          _buildInput(
            controller: _forgotConfirmPwController,
            glyph: '🔒',
            hintText: 'Re-enter new password',
            obscureText: !_showForgotPw,
          ),
          const SizedBox(height: 18),

          _buildPrimaryButton(
            title: 'Reset & Update Password',
            loadingTitle: 'Updating Password...',
            onPressed: _loading ? null : _handleResetPasswordSubmit,
          ),
        ],

        const SizedBox(height: 12),
        TextButton(
          onPressed: () {
            setState(() {
              _authMode = 'login';
              _forgotStep = 1;
            });
            _setFeedback(null, null);
          },
          child: const Text(
            '← Back to Sign In',
            style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600, fontSize: 13),
          ),
        ),
      ],
    );
  }

  // ----------------------------------------------------
  // GUEST FOOTER
  // ----------------------------------------------------
  Widget _buildGuestFooter() {
    return Column(
      children: [
        const Divider(color: Color(0xFFF1F5F9), height: 24, thickness: 1),
        InkWell(
          onTap: () => Navigator.of(context).pop(),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('←', style: TextStyle(fontSize: 14, color: Color(0xFF475569), fontWeight: FontWeight.bold)),
                SizedBox(width: 8),
                Flexible(
                  child: Text(
                    'Continue as Guest (Explore Facilities Without Signing In)',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF475569),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ----------------------------------------------------
  // UI HELPERS
  // ----------------------------------------------------
  Widget _buildFieldLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: Color(0xFF334155),
      ),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required String glyph,
    required String hintText,
    bool obscureText = false,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
    Widget? suffixIcon,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      style: const TextStyle(fontSize: 13.5, color: Color(0xFF0F172A), fontWeight: FontWeight.w500),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        prefixIcon: Padding(
          padding: const EdgeInsets.only(left: 12, right: 8),
          child: Text(glyph, style: const TextStyle(fontSize: 15)),
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 36, minHeight: 20),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF0284C7), width: 1.5),
        ),
      ),
    );
  }

  Widget _buildPrimaryButton({
    required String title,
    required String loadingTitle,
    required VoidCallback? onPressed,
  }) {
    return SizedBox(
      height: 48,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF0284C7), Color(0xFF0369A1)],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: const [
            BoxShadow(
              color: Color(0x400284C7),
              blurRadius: 10,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            foregroundColor: Colors.white,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _loading
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    ),
                    const SizedBox(width: 10),
                    Text(loadingTitle, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  ],
                )
              : Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
        ),
      ),
    );
  }

  Widget _buildDemoChip({required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 7),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
        ),
      ),
    );
  }
}
