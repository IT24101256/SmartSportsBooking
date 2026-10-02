import 'dart:convert';
import 'dart:io';

class SavedCard {
  final String id;
  final String brand;
  final String lastFour;
  final String cardholderName;
  final String expiryMonth;
  final String expiryYear;
  final bool isDefault;

  SavedCard({
    required this.id,
    required this.brand,
    required this.lastFour,
    required this.cardholderName,
    required this.expiryMonth,
    required this.expiryYear,
    this.isDefault = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'brand': brand,
        'lastFour': lastFour,
        'cardholderName': cardholderName,
        'expiryMonth': expiryMonth,
        'expiryYear': expiryYear,
        'isDefault': isDefault,
      };

  factory SavedCard.fromJson(Map<String, dynamic> json) => SavedCard(
        id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
        brand: json['brand']?.toString() ?? 'Visa',
        lastFour: json['lastFour']?.toString() ?? '4242',
        cardholderName: json['cardholderName']?.toString() ?? 'Member Card',
        expiryMonth: json['expiryMonth']?.toString() ?? '12',
        expiryYear: json['expiryYear']?.toString() ?? '2028',
        isDefault: json['isDefault'] == true,
      );
}

class SavedCardsService {
  static final SavedCardsService _instance = SavedCardsService._internal();
  factory SavedCardsService() => _instance;
  SavedCardsService._internal();

  List<SavedCard> _cachedCards = [];
  bool _initialized = false;

  File get _storageFile {
    final tempDir = Directory.systemTemp.path;
    return File('$tempDir/smartsports_cards_store.json');
  }

  Future<List<SavedCard>> getCards() async {
    if (_initialized) return List.unmodifiable(_cachedCards);

    try {
      final file = _storageFile;
      if (await file.exists()) {
        final content = await file.readAsString();
        final List<dynamic> decoded = jsonDecode(content);
        _cachedCards = decoded.map((e) => SavedCard.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      }
    } catch (_) {}

    if (_cachedCards.isEmpty) {
      _cachedCards = [
        SavedCard(
          id: 'card_demo_1',
          brand: 'Visa',
          lastFour: '4242',
          cardholderName: 'Member Athlete',
          expiryMonth: '12',
          expiryYear: '2028',
          isDefault: true,
        ),
        SavedCard(
          id: 'card_demo_2',
          brand: 'Mastercard',
          lastFour: '8888',
          cardholderName: 'Member Athlete',
          expiryMonth: '06',
          expiryYear: '2029',
          isDefault: false,
        ),
      ];
      await _persist();
    }

    _initialized = true;
    return List.unmodifiable(_cachedCards);
  }

  Future<void> addCard(SavedCard card) async {
    await getCards();
    final newCards = _cachedCards.map((c) => card.isDefault ? SavedCard(
      id: c.id,
      brand: c.brand,
      lastFour: c.lastFour,
      cardholderName: c.cardholderName,
      expiryMonth: c.expiryMonth,
      expiryYear: c.expiryYear,
      isDefault: false,
    ) : c).toList();

    newCards.add(card);
    _cachedCards = newCards;
    await _persist();
  }

  Future<void> deleteCard(String id) async {
    await getCards();
    _cachedCards = _cachedCards.where((c) => c.id != id).toList();
    if (_cachedCards.isNotEmpty && !_cachedCards.any((c) => c.isDefault)) {
      final first = _cachedCards.first;
      _cachedCards[0] = SavedCard(
        id: first.id,
        brand: first.brand,
        lastFour: first.lastFour,
        cardholderName: first.cardholderName,
        expiryMonth: first.expiryMonth,
        expiryYear: first.expiryYear,
        isDefault: true,
      );
    }
    await _persist();
  }

  Future<void> setDefaultCard(String id) async {
    await getCards();
    _cachedCards = _cachedCards.map((c) => SavedCard(
      id: c.id,
      brand: c.brand,
      lastFour: c.lastFour,
      cardholderName: c.cardholderName,
      expiryMonth: c.expiryMonth,
      expiryYear: c.expiryYear,
      isDefault: c.id == id,
    )).toList();
    await _persist();
  }

  Future<void> _persist() async {
    try {
      final file = _storageFile;
      await file.writeAsString(jsonEncode(_cachedCards.map((c) => c.toJson()).toList()));
    } catch (_) {}
  }
}
