# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution file
COPY ["superstore.sln", "./"]

# Copy project files into directory casing matching superstore.sln
COPY ["superstore.Api/superstore.Api.csproj", "Superstore.Api/"]
COPY ["superstore.Application/superstore.Application.csproj", "Superstore.Application/"]
COPY ["superstore.Core/superstore.Core.csproj", "Superstore.Core/"]
COPY ["superstore.Infrastructure/superstore.Infrastructure.csproj", "Superstore.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "superstore.sln"

# Copy all remaining source files
COPY . .

# Ensure folder structure matches case expectations for the build
RUN cp -rn superstore.Api/. Superstore.Api/ 2>/dev/null || true && \
    cp -rn superstore.Application/. Superstore.Application/ 2>/dev/null || true && \
    cp -rn superstore.Core/. Superstore.Core/ 2>/dev/null || true && \
    cp -rn superstore.Infrastructure/. Superstore.Infrastructure/ 2>/dev/null || true

# Build and publish release output
RUN dotnet publish "superstore.sln" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime Image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Copy built binaries from build stage
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "superstore.Api.dll"]