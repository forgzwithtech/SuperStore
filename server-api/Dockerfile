# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project definitions first for optimal layer caching
COPY ["superstore.sln", "./"]
COPY ["superstore.Api/superstore.Api.csproj", "superstore.Api/"]
COPY ["superstore.Application/superstore.Application.csproj", "superstore.Application/"]
COPY ["superstore.Core/superstore.Core.csproj", "superstore.Core/"]
COPY ["superstore.Infrastructure/superstore.Infrastructure.csproj", "superstore.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "superstore.sln"

# Copy the rest of the source code
COPY . .

# Build and publish release output
WORKDIR "/src/superstore.Api"
RUN dotnet publish "superstore.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime Image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Expose standard port
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Copy built binaries from build stage
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "superstore.Api.dll"]