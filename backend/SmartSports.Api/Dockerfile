# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies (enables Docker layer caching)
COPY SmartSports.Api.csproj ./
RUN dotnet restore SmartSports.Api.csproj

# Copy all source files and publish release build
COPY . .
RUN dotnet publish SmartSports.Api.csproj -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Pre-create upload directories for profiles, bank slips, and reviews
RUN mkdir -p /app/uploads/profiles /app/uploads/slips /app/uploads/reviews

# Copy published application
COPY --from=build /app/publish .

# Environment configuration (Render, Railway, Cloud Run, Docker compatible)
ENV PORT=10000
ENV ASPNETCORE_URLS=http://+:10000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 10000
EXPOSE 8080

ENTRYPOINT ["dotnet", "SmartSports.Api.dll"]