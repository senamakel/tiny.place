//! Endpoint tests for `MarketplaceApi`. Each test points the client at a
//! catch-all mock, invokes a method, and asserts the request method and path.
//! Response bodies are permissive — the goal is to exercise request
//! construction, auth signing, and the response pipeline. Free helper functions
//! (`compare_amount`, `five_percent_increment`, `minimum_identity_bid`) are
//! tested directly against sample inputs.

mod common;

use common::*;
use serde_json::json;

use tinyplace::api::marketplace::{
    compare_amount, five_percent_increment, minimum_identity_bid, IdentityBidPaymentOptions,
    IdentityOfferPaymentOptions, OfferQueryParams,
};
use tinyplace::types::{
    IdentityBid, IdentityBuyRequest, IdentityListing, IdentityOffer, IdentityOfferAcceptRequest,
    MarketplacePrice, Product, ProductBuyRequest, ProductCreateRequest, ProductQueryParams,
    ProductReview,
};

// --- Products ---------------------------------------------------------------

#[tokio::test]
async fn marketplace_list_products() {
    let server = any_ok(json!({"products": []})).await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .list_products(Some(&ProductQueryParams::default()))
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/marketplace/products"));
}

#[tokio::test]
async fn marketplace_create_product() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .create_product(ProductCreateRequest::default())
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/marketplace/products"));
}

#[tokio::test]
async fn marketplace_get_product() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.marketplace.get_product("prod_1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("prod_1"));
}

#[tokio::test]
async fn marketplace_update_product() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .update_product("prod_1", Product::default())
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "PUT");
    assert!(req.url.path().contains("prod_1"));
}

#[tokio::test]
async fn marketplace_delete_product() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.marketplace.delete_product("prod_1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "DELETE");
    assert!(req.url.path().contains("prod_1"));
}

#[tokio::test]
async fn marketplace_buy_product() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .buy_product("prod_1", ProductBuyRequest::default())
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/buy"));
}

#[tokio::test]
async fn marketplace_download_product() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .download_product("prod_1", "purchase_1", None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/download/"));
}

#[tokio::test]
async fn marketplace_get_product_delivery() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .get_product_delivery("prod_1", "purchase_1", None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/delivery"));
}

#[tokio::test]
async fn marketplace_update_product_delivery() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .update_product_delivery("prod_1", "purchase_1", json!({}), Some("@seller"))
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/delivery"));
}

#[tokio::test]
async fn marketplace_list_product_reviews() {
    let server = any_ok(json!({"reviews": []})).await;
    let client = client_for(&server);
    let _ = client.marketplace.list_product_reviews("prod_1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/reviews"));
}

#[tokio::test]
async fn marketplace_create_product_review() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .create_product_review("prod_1", ProductReview::default())
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/reviews"));
}

// --- Identity Listings ------------------------------------------------------

#[tokio::test]
async fn marketplace_list_identities() {
    let server = any_ok(json!({"identities": []})).await;
    let client = client_for(&server);
    let _ = client.marketplace.list_identities(None, None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/marketplace/identities"));
}

#[tokio::test]
async fn marketplace_create_identity_listing() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .create_identity_listing(IdentityListing::default())
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/marketplace/identities"));
}

#[tokio::test]
async fn marketplace_delete_identity_listing() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .delete_identity_listing("listing_1")
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "DELETE");
    assert!(req.url.path().contains("listing_1"));
}

#[tokio::test]
async fn marketplace_buy_identity_listing() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .buy_identity_listing("listing_1", IdentityBuyRequest::default())
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/buy"));
}

#[tokio::test]
async fn marketplace_list_bids() {
    let server = any_ok(json!({"bids": []})).await;
    let client = client_for(&server);
    let _ = client.marketplace.list_bids("listing_1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/bids"));
}

#[tokio::test]
async fn marketplace_place_bid() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .place_bid("listing_1", IdentityBid::default())
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/bids"));
}

#[tokio::test]
async fn marketplace_place_bid_with_payment() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let bid = IdentityBid {
        bidder: Some("@bidder".into()),
        price: Some(MarketplacePrice {
            amount: "100".into(),
            asset: "USDC".into(),
            network: "solana".into(),
        }),
        ..Default::default()
    };
    let options = IdentityBidPaymentOptions {
        listing: Some(IdentityListing {
            seller: Some("@seller".into()),
            name: Some("@target".into()),
            ..Default::default()
        }),
        ..Default::default()
    };
    let _ = client
        .marketplace
        .place_bid_with_payment("listing_1", bid, options)
        .await;
    // The listing is supplied via options, so the only request is the bid POST.
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/bids"));
}

#[tokio::test]
async fn marketplace_close_listing() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .close_listing("listing_1", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/close"));
}

#[tokio::test]
async fn marketplace_set_default_identity_listing() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .set_default_identity_listing("listing_1", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/default"));
}

#[tokio::test]
async fn marketplace_identity_sale_history() {
    let server = any_ok(json!({"history": []})).await;
    let client = client_for(&server);
    let _ = client.marketplace.identity_sale_history("@alice").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/history/"));
}

#[tokio::test]
async fn marketplace_identity_floor() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.marketplace.identity_floor(Some(5)).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/floor"));
}

// --- Offers -----------------------------------------------------------------

#[tokio::test]
async fn marketplace_list_offers() {
    let server = any_ok(json!({"offers": []})).await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .list_offers(Some(&OfferQueryParams::default()))
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/marketplace/offers"));
}

#[tokio::test]
async fn marketplace_create_offer() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .create_offer(IdentityOffer::default())
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/marketplace/offers"));
}

#[tokio::test]
async fn marketplace_create_offer_with_payment() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let offer = IdentityOffer {
        buyer: Some("@buyer".into()),
        name: Some("@target".into()),
        price: Some(MarketplacePrice {
            amount: "100".into(),
            asset: "USDC".into(),
            network: "solana".into(),
        }),
        ..Default::default()
    };
    let _ = client
        .marketplace
        .create_offer_with_payment(offer, IdentityOfferPaymentOptions::default())
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/marketplace/offers"));
}

#[tokio::test]
async fn marketplace_cancel_offer() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.marketplace.cancel_offer("offer_1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "DELETE");
    assert!(req.url.path().contains("offer_1"));
}

#[tokio::test]
async fn marketplace_accept_offer() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .marketplace
        .accept_offer("offer_1", IdentityOfferAcceptRequest::default())
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/accept"));
}

// --- Browsing ---------------------------------------------------------------

#[tokio::test]
async fn marketplace_browse_marketplace() {
    let server = any_ok(json!({"products": [], "identities": []})).await;
    let client = client_for(&server);
    let _ = client.marketplace.browse_marketplace(None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/marketplace"));
}

#[tokio::test]
async fn marketplace_categories() {
    let server = any_ok(json!({"categories": []})).await;
    let client = client_for(&server);
    let _ = client.marketplace.categories().await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/categories"));
}

#[tokio::test]
async fn marketplace_featured() {
    let server = any_ok(json!({"items": []})).await;
    let client = client_for(&server);
    let _ = client.marketplace.featured().await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/featured"));
}

#[tokio::test]
async fn marketplace_recent() {
    let server = any_ok(json!({"sales": []})).await;
    let client = client_for(&server);
    let _ = client.marketplace.recent().await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/recent"));
}

// --- Free functions ---------------------------------------------------------

#[tokio::test]
async fn marketplace_compare_amount() {
    assert_eq!(compare_amount("2", "1"), 1);
    assert_eq!(compare_amount("1", "2"), -1);
    assert_eq!(compare_amount("5", "5"), 0);
    // Non-numeric inputs fall back to 0.
    assert_eq!(compare_amount("abc", "1"), 0);
}

#[tokio::test]
async fn marketplace_five_percent_increment() {
    // (100*105 + 99) / 100 = 10599 / 100 = 105
    assert_eq!(five_percent_increment("100"), "105");
    // Non-numeric inputs are returned unchanged.
    assert_eq!(five_percent_increment("abc"), "abc");
}

#[tokio::test]
async fn marketplace_minimum_identity_bid() {
    // Listing with only a start price: minimum is the start price.
    let listing = IdentityListing {
        price: Some(MarketplacePrice {
            amount: "100".into(),
            asset: "USDC".into(),
            network: "solana".into(),
        }),
        ..Default::default()
    };
    assert_eq!(minimum_identity_bid(&listing), "100");

    // Listing with a standing high bid: minimum is 5% above the high bid.
    let listing_with_bid = IdentityListing {
        price: Some(MarketplacePrice {
            amount: "100".into(),
            asset: "USDC".into(),
            network: "solana".into(),
        }),
        highest_bid: Some(IdentityBid {
            price: Some(MarketplacePrice {
                amount: "200".into(),
                asset: "USDC".into(),
                network: "solana".into(),
            }),
            ..Default::default()
        }),
        ..Default::default()
    };
    assert_eq!(minimum_identity_bid(&listing_with_bid), "210");
}
