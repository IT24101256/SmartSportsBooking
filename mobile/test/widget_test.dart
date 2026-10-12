import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/screens/profile/profile_screen.dart';

void main() {
  testWidgets('ProfileScreen displays account information', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ProfileScreen(
            onLogout: () {},
            onConfigureServer: () {},
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Account Information'), findsOneWidget);
    expect(find.text('Saved Payment Cards'), findsOneWidget);
    expect(find.text('Change Password'), findsOneWidget);
  });

  testWidgets('ProfileScreen displays backend configuration option', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ProfileScreen(
            onLogout: () {},
            onConfigureServer: () {},
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Configure Backend URL'), findsOneWidget);
  });

  testWidgets('ProfileScreen displays sign out option', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ProfileScreen(
            onLogout: () {},
            onConfigureServer: () {},
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Sign Out of MySpot'), findsOneWidget);
  });
}
