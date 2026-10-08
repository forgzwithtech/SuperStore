using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace Superstore.API.Services
{
    public class FileUploadService
    {
        private readonly HttpClient _httpClient;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        private readonly string _bucketName;
        private readonly ILogger<FileUploadService> _logger;

        public FileUploadService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<FileUploadService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _supabaseUrl = configuration["Supabase:Url"]?.TrimEnd('/') ?? string.Empty;
            _serviceRoleKey = configuration["Supabase:ServiceRoleKey"] ?? string.Empty;
            _bucketName = configuration["Supabase:Bucket"] ?? "device-uploads";
        }

        public async Task<string> UploadDeviceImageAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return string.Empty;

            string extension = Path.GetExtension(file.FileName);
            string uniqueFileName = $"{Guid.NewGuid()}{extension}";
            string objectPath = $"devices/{uniqueFileName}";

            string endpoint = $"{_supabaseUrl}/storage/v1/object/{_bucketName}/{objectPath}";

            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
            request.Headers.Add("apikey", _serviceRoleKey);

            using var stream = file.OpenReadStream();
            using var content = new StreamContent(stream);
            content.Headers.ContentType = new MediaTypeHeaderValue(
                string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType);
            request.Content = content;

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogError("Supabase upload failed with status code {StatusCode}: {Error}", response.StatusCode, errorBody);
                throw new InvalidOperationException($"Failed to upload image to Supabase Storage: {response.StatusCode} - {errorBody}");
            }

            return $"{_supabaseUrl}/storage/v1/object/public/{_bucketName}/{objectPath}";
        }
    }
}