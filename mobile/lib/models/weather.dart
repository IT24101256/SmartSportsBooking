class CurrentWeather {
  final double? temperature;
  final double? apparentTemperature;
  final int? relativeHumidity;
  final double? precipitation;
  final double? windSpeed;
  final int? weatherCode;
  final String condition;
  final String icon;
  final bool isSuitableForPlay;
  final String suitabilityMessage;
  final String locationName;
  final DateTime? recordedAt;

  CurrentWeather({
    this.temperature,
    this.apparentTemperature,
    this.relativeHumidity,
    this.precipitation,
    this.windSpeed,
    this.weatherCode,
    this.condition = 'Mainly Clear',
    this.icon = '🌤️',
    this.isSuitableForPlay = true,
    this.suitabilityMessage = 'Good Conditions for Play',
    this.locationName = 'Colombo Arena Complex',
    this.recordedAt,
  });

  factory CurrentWeather.fromJson(Map<String, dynamic> json) {
    return CurrentWeather(
      temperature: json['temperature'] != null ? (json['temperature'] as num).toDouble() : null,
      apparentTemperature: json['apparentTemperature'] != null ? (json['apparentTemperature'] as num).toDouble() : null,
      relativeHumidity: json['relativeHumidity'] as int?,
      precipitation: json['precipitation'] != null ? (json['precipitation'] as num).toDouble() : null,
      windSpeed: json['windSpeed'] != null ? (json['windSpeed'] as num).toDouble() : null,
      weatherCode: json['weatherCode'] as int?,
      condition: json['condition']?.toString() ?? 'Mainly Clear',
      icon: json['icon']?.toString() ?? '🌤️',
      isSuitableForPlay: json['isSuitableForPlay'] == true,
      suitabilityMessage: json['suitabilityMessage']?.toString() ?? 'Good Conditions for Play',
      locationName: json['locationName']?.toString() ?? 'Colombo Arena Complex',
      recordedAt: json['recordedAt'] != null ? DateTime.tryParse(json['recordedAt'].toString()) : null,
    );
  }
}

class WeatherRiskAlert {
  final int bookingId;
  final String customerName;
  final String contactNumber;
  final String facilityName;
  final String courtType;
  final String sportCategory;
  final DateTime bookingDate;
  final String formattedDate;
  final String formattedTimeSlot;
  final double precipitationProbability;
  final double rainMm;
  final double windSpeed;
  final String condition;
  final String icon;
  final String riskLevel;
  final String warningReason;
  final String recommendedAction;
  final bool isRescheduleOffered;

  WeatherRiskAlert({
    required this.bookingId,
    this.customerName = '',
    this.contactNumber = '',
    this.facilityName = '',
    this.courtType = '',
    this.sportCategory = '',
    required this.bookingDate,
    this.formattedDate = '',
    this.formattedTimeSlot = '',
    this.precipitationProbability = 0,
    this.rainMm = 0,
    this.windSpeed = 0,
    this.condition = '',
    this.icon = '🌧️',
    this.riskLevel = 'Medium',
    this.warningReason = '',
    this.recommendedAction = '',
    this.isRescheduleOffered = false,
  });

  factory WeatherRiskAlert.fromJson(Map<String, dynamic> json) {
    return WeatherRiskAlert(
      bookingId: json['bookingId'] is int ? json['bookingId'] : int.tryParse(json['bookingId']?.toString() ?? '0') ?? 0,
      customerName: json['customerName']?.toString() ?? '',
      contactNumber: json['contactNumber']?.toString() ?? '',
      facilityName: json['facilityName']?.toString() ?? '',
      courtType: json['courtType']?.toString() ?? '',
      sportCategory: json['sportCategory']?.toString() ?? '',
      bookingDate: json['bookingDate'] != null ? DateTime.tryParse(json['bookingDate'].toString()) ?? DateTime.now() : DateTime.now(),
      formattedDate: json['formattedDate']?.toString() ?? '',
      formattedTimeSlot: json['formattedTimeSlot']?.toString() ?? '',
      precipitationProbability: json['precipitationProbability'] != null ? (json['precipitationProbability'] as num).toDouble() : 0.0,
      rainMm: json['rainMm'] != null ? (json['rainMm'] as num).toDouble() : 0.0,
      windSpeed: json['windSpeed'] != null ? (json['windSpeed'] as num).toDouble() : 0.0,
      condition: json['condition']?.toString() ?? '',
      icon: json['icon']?.toString() ?? '🌧️',
      riskLevel: json['riskLevel']?.toString() ?? 'Medium',
      warningReason: json['warningReason']?.toString() ?? '',
      recommendedAction: json['recommendedAction']?.toString() ?? '',
      isRescheduleOffered: json['isRescheduleOffered'] == true,
    );
  }
}

class DailyForecastItem {
  final String date;
  final String dayName;
  final double? maxTemperature;
  final double? minTemperature;
  final double? precipitationSum;
  final double? precipitationProbabilityMax;
  final double? maxWindSpeed;
  final int? weatherCode;
  final String condition;
  final String icon;
  final bool isSuitableForPlay;

  DailyForecastItem({
    required this.date,
    this.dayName = '',
    this.maxTemperature,
    this.minTemperature,
    this.precipitationSum,
    this.precipitationProbabilityMax,
    this.maxWindSpeed,
    this.weatherCode,
    this.condition = 'Clear',
    this.icon = '☀️',
    this.isSuitableForPlay = true,
  });

  factory DailyForecastItem.fromJson(Map<String, dynamic> json) {
    return DailyForecastItem(
      date: json['date']?.toString() ?? '',
      dayName: json['dayName']?.toString() ?? '',
      maxTemperature: json['maxTemperature'] != null ? (json['maxTemperature'] as num).toDouble() : null,
      minTemperature: json['minTemperature'] != null ? (json['minTemperature'] as num).toDouble() : null,
      precipitationSum: json['precipitationSum'] != null ? (json['precipitationSum'] as num).toDouble() : null,
      precipitationProbabilityMax: json['precipitationProbabilityMax'] != null ? (json['precipitationProbabilityMax'] as num).toDouble() : null,
      maxWindSpeed: json['maxWindSpeed'] != null ? (json['maxWindSpeed'] as num).toDouble() : null,
      weatherCode: json['weatherCode'] as int?,
      condition: json['condition']?.toString() ?? 'Clear',
      icon: json['icon']?.toString() ?? '☀️',
      isSuitableForPlay: json['isSuitableForPlay'] == true,
    );
  }
}

class WeatherOverview {
  final CurrentWeather current;
  final List<DailyForecastItem> dailyForecast;
  final List<WeatherRiskAlert> alerts;

  WeatherOverview({
    required this.current,
    this.dailyForecast = const [],
    this.alerts = const [],
  });

  factory WeatherOverview.fromJson(Map<String, dynamic> json) {
    return WeatherOverview(
      current: json['current'] != null
          ? CurrentWeather.fromJson(json['current'] as Map<String, dynamic>)
          : CurrentWeather(),
      dailyForecast: (json['dailyForecast'] as List<dynamic>?)
              ?.map((e) => DailyForecastItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      alerts: (json['alerts'] as List<dynamic>?)
              ?.map((e) => WeatherRiskAlert.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}
