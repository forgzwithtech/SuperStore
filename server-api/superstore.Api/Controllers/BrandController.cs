using Superstore.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace Superstore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BrandsController : ControllerBase
{
    private readonly SuperstoreDbContext _dbContext;

    public BrandsController(SuperstoreDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // ─── GET ALL BRANDS FOR SIDEBAR FILTERS ─────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // SUPERMARKET UPGRADE: 
        // We calculate the ProductCount on the fly in the database.
        // This makes building UI elements like "Unilever (12 items)" trivial for the frontend.
        var brands = await _dbContext.Brands
            .Select(b => new 
            {
                Id = b.Id,
                Name = b.Name,
                ProductCount = b.Products.Count()
            })
            .OrderBy(b => b.Name)
            .ToListAsync();
            
        return Ok(brands);
    }
}