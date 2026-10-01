import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('SmartSports app launches directly into Overview page with Sign In modal option', (WidgetTester tester) async {
    // Provide sufficient surface size for mobile rendering
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(const SmartSportsApp());
    await tester.pump();

    // Verify initial launch lands on the Overview dashboard
    expect(find.text('MySpot'), findsOneWidget);
    expect(find.text('GUEST'), findsOneWidget);
    expect(find.text('Overview'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);

    // Tap "Sign In" button in AppBar to open the web-matched AuthModal
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();

    // Verify AuthModal elements
    expect(find.text('Secure Member Access'), findsOneWidget);
    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('Admin'), findsOneWidget);
    expect(find.text('Manager'), findsOneWidget);
    expect(find.text('Member'), findsOneWidget);
    expect(find.text('Continue as Guest (Explore Facilities Without Signing In)'), findsOneWidget);

    // Tap "Continue as Guest" to dismiss modal
    await tester.tap(find.text('Continue as Guest (Explore Facilities Without Signing In)'));
    await tester.pumpAndSettle();

    // Modal is dismissed, user remains on Overview
    expect(find.text('Secure Member Access'), findsNothing);
    expect(find.text('GUEST'), findsOneWidget);
  });
}
