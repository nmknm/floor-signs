import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            await page.goto("file:///app/index.html")

            # --- Test 1: Check if the script executed at all ---
            h1_locator = page.locator("h1")
            await expect(h1_locator).to_have_text("Script Executed", timeout=5000)
            print("SUCCESS: Script execution confirmed (H1 text changed).")

            # --- Test 2: Check if the canvas drawing worked ---
            canvas_locator = page.locator("#floor-sign-canvas")
            initial_data_url = await canvas_locator.evaluate("canvas => canvas.toDataURL()")

            # Poll until the canvas is rendered.
            for _ in range(10): # 5 second timeout
                await page.wait_for_timeout(500)
                current_data_url = await canvas_locator.evaluate("canvas => canvas.toDataURL()")
                if current_data_url != initial_data_url:
                    print("SUCCESS: Baseline canvas draw detected.")
                    await page.screenshot(path="jules-scratch/verification/baseline_success.png")
                    await browser.close()
                    return # Exit successfully

            # If the loop finishes, it's a failure
            print("FAILURE: Canvas drawing did not happen, even though script ran.")
            await page.screenshot(path="jules-scratch/verification/baseline_fail.png")
            raise Exception("Canvas drawing failed.")

        except Exception as e:
            print(f"An error occurred during the test: {e}")
            await page.screenshot(path="jules-scratch/verification/test_error.png")
            await browser.close()
            raise # Re-raise the exception to fail the script

if __name__ == "__main__":
    asyncio.run(main())
