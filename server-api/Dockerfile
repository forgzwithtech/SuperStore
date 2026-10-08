# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy all source files
COPY . .

# Fix case discrepancies between Windows git and Linux solution definitions
RUN for dir in superstore.*; do \
      target="Superstore.${dir#superstore.}"; \
      if [ -d "$dir" ] && [ "$dir" != "$target" ]; then \
        cp -r "$dir" "$target"; \
      fi; \
    done && \
    for proj in Superstore.*/*.csproj; do \
  dir=$(dirname "$proj"); \
  base=$(basename "$proj"); \
  target="$dir/Superstore.${base#superstore.}"; \
  if [ -f "$proj" ] && [ "$proj" != "$target" ]; then \
    cp "$proj" "$target"; \
  fi; \
done

# Restore dependencies
RUN dotnet restore "superstore.sln"

# Publish the exact project file explicitly
RUN dotnet publish "Superstore.Api/Superstore.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime Image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Superstore.Api.dll"]