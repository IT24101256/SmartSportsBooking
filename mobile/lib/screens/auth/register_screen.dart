import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class RegisterScreen extends StatefulWidget {
  final VoidCallback onRegistered;
  final VoidCallback onBackToLogin;

  const RegisterScreen({
    super.key,
    required this.onRegistered,
    required this.onBackToLogin,
  });

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final ApiService _apiService = ApiService();

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _contactNumberController = TextEditingController();
  final _nicNumberController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _otpController = TextEditingController();

  bool _isStepOtp = false;
  String? _devOtp;
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _contactNumberController.dispose();
    _nicNumberController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _handleStep1Submit() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final contact = _contactNumberController.text.trim();
    final nic = _nicNumberController.text.trim();
    final pass = _passwordController.text;
    final confirmPass = _confirmPasswordController.text;

    if (name.isEmpty || email.isEmpty || contact.isEmpty || nic.isEmpty || pass.isEmpty) {
      setState(() => _errorMessage = 'Please complete all required fields.');
      return;
    }

    if (!RegExp(r'^\d{10}$').hasMatch(contact)) {
      setState(() => _errorMessage = 'Contact number must be exactly 10 digits.');
      return;
    }

    if (!RegExp(r'^(\d{9}[vVxX]|\d{12})$').hasMatch(nic)) {
      setState(() => _errorMessage = 'NIC must be 12 digits or 9 digits followed by V or X.');
      return;
    }

    if (pass.length < 8) {
      setState(() => _errorMessage = 'Password must be at least 8 characters long.');
      return;
    }

    if (pass != confirmPass) {
      setState(() => _errorMessage = 'Passwords do not match.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _apiService.register(
        fullName: name,
        email: email,
        contactNumber: contact,
        nicNumber: nic,
        password: pass,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          _isStepOtp = true;
          _devOtp = res['devOtp']?.toString();
          _successMessage = res['message']?.toString() ?? 'OTP sent to your email!';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  Future<void> _handleStep2VerifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.isEmpty) {
      setState(() => _errorMessage = 'Please enter the verification code.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await _apiService.verifyOtp(_emailController.text.trim(), otp);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Registration successful! Please sign in.')),
        );
        widget.onRegistered();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppTheme.darkNavy, Color(0xFF1E3A8A), AppTheme.primary],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Card(
                  elevation: 16,
                  color: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                  child: Padding(
                    padding: const EdgeInsets.all(26),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_back),
                              onPressed: widget.onBackToLogin,
                            ),
                            const Expanded(
                              child: Text(
                                'Create Account',
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                  color: AppTheme.deepHeading,
                                ),
                              ),
                            ),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.asset(
                                'assets/images/app-icon.png',
                                width: 36,
                                height: 36,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _isStepOtp
                              ? 'Enter the 6-digit OTP sent to ${_emailController.text}'
                              : 'Join MySpot for direct venue booking',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                        ),
                        const SizedBox(height: 16),

                        if (_errorMessage != null) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.dangerBg,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              _errorMessage!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: AppTheme.dangerDark, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(height: 14),
                        ],

                        if (_successMessage != null) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.successBg,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              _successMessage!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: AppTheme.successDark, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(height: 14),
                        ],

                        if (!_isStepOtp) ...[
                          TextField(
                            controller: _nameController,
                            decoration: const InputDecoration(labelText: 'Full Name', prefixIcon: Icon(Icons.person_outline)),
                          ),
                          const SizedBox(height: 12),

                          TextField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(labelText: 'Email Address', prefixIcon: Icon(Icons.email_outlined)),
                          ),
                          const SizedBox(height: 12),

                          TextField(
                            controller: _contactNumberController,
                            keyboardType: TextInputType.phone,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            maxLength: 10,
                            decoration: const InputDecoration(labelText: 'Contact Number (10 digits)', prefixIcon: Icon(Icons.phone_outlined), counterText: ''),
                          ),
                          const SizedBox(height: 12),

                          TextField(
                            controller: _nicNumberController,
                            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9vVxX]'))],
                            maxLength: 12,
                            decoration: const InputDecoration(labelText: 'NIC Number', prefixIcon: Icon(Icons.badge_outlined), counterText: ''),
                          ),
                          const SizedBox(height: 12),

                          TextField(
                            controller: _passwordController,
                            obscureText: true,
                            decoration: const InputDecoration(labelText: 'Password (min 8 chars)', prefixIcon: Icon(Icons.lock_outline)),
                          ),
                          const SizedBox(height: 12),

                          TextField(
                            controller: _confirmPasswordController,
                            obscureText: true,
                            decoration: const InputDecoration(labelText: 'Confirm Password', prefixIcon: Icon(Icons.lock_reset_outlined)),
                          ),
                          const SizedBox(height: 20),

                          ElevatedButton(
                            onPressed: _isLoading ? null : _handleStep1Submit,
                            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                            child: _isLoading
                                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Next: Verify Email', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                          ),
                        ] else ...[
                          if (_devOtp != null)
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(bottom: 16),
                              decoration: BoxDecoration(
                                color: AppTheme.warningBg,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.developer_mode, color: AppTheme.warningDark),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'Dev OTP: $_devOtp (SMTP fallback)',
                                      style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.warningDark),
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () => _otpController.text = _devOtp!,
                                    child: const Text('Auto-fill'),
                                  ),
                                ],
                              ),
                            ),

                          TextField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 6),
                            decoration: const InputDecoration(
                              labelText: 'Verification OTP',
                              hintText: '• • • • • •',
                            ),
                          ),
                          const SizedBox(height: 20),

                          ElevatedButton(
                            onPressed: _isLoading ? null : _handleStep2VerifyOtp,
                            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                            child: _isLoading
                                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Complete Registration', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                          ),
                          const SizedBox(height: 12),

                          TextButton(
                            onPressed: () => setState(() => _isStepOtp = false),
                            child: const Text('Back to Edit Details'),
                          ),
                        ],

                        const SizedBox(height: 12),
                        TextButton(
                          onPressed: widget.onBackToLogin,
                          child: const Text('Already have an account? Sign in', style: TextStyle(fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
