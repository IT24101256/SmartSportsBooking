// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('SmartSports dashboard loads', (WidgetTester tester) async {
    await tester.pumpWidget(const SmartSportsApp());

    expect(find.text('SmartSports'), findsWidgets);
    expect(find.text('Book now'), findsOneWidget);
    expect(find.text('Play harder.\nBook smarter.'), findsOneWidget);
  });
}
