# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the entire server source tree
COPY . .

# Ensure directory names match the exact PascalCase expected by superstore.sln on case-sensitive Linux
RUN [ -d "superstore.Api" ] && cp -r superstore.Api Superstore.Api || true
RUN [ -d "superstore.Application" ] && cp -r superstore.Application Superstore.Application || true
RUN [ -d "superstore.Core" ] && cp -r superstore.Core Superstore.Core || true
RUN [ -d "superstore.Infrastructure" ] && cp -r superstore.Infrastructure Superstore.Infrastructure || true

# Restore dependencies
RUN dotnet restore "superstore.sln"

# Publish the API project to release folder
RUN dotnet publish "Superstore.Api/superstore.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime Image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "superstore.Api.dll"] 
