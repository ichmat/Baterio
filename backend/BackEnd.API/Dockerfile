FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["BackEnd.API/BackEnd.API.csproj", "BackEnd.API/"]
COPY ["BackEnd.Shared/BackEnd.Shared.csproj", "BackEnd.Shared/"]
RUN dotnet restore "BackEnd.API/BackEnd.API.csproj"
COPY . .
WORKDIR "/src/BackEnd.API"
RUN dotnet build -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BackEnd.API.dll"]
