'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Star,
  ShoppingBag,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  Check,
  ChevronRight,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { Header } from '../../../../../components/layout/Header';
import { Footer } from '../../../../../components/layout/Footer';
import { Container } from '../../../../../components/layout/Container';
import { Badge } from '../../../../../components/ui/Badge';
import { Button } from '../../../../../components/ui/Button';
import { FavouriteButton } from '../../../../../components/ui/FavouriteButton';
import { ProductViewer3D } from '../../../../../components/supplies/ProductViewer3D';
import { useCart } from '../../../../../lib/cart/CartContext';
import { useAuth } from '../../../../../lib/auth/AuthContext';
import { apiFetch } from '../../../../../lib/api/client';
import {
  ProductDetailSummary,
  ProductVariantSummary,
  ProductReviewSummary,
} from '@pawnest/shared';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const { addItem, isLoading: isCartLoading } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = React.useState<ProductDetailSummary | null>(null);
  const [reviews, setReviews] = React.useState<ProductReviewSummary[]>([]);
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariantSummary | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState<'desc' | 'specs' | 'ingredients'>('desc');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);

  // Review Form state
  const [isReviewOpen, setIsReviewOpen] = React.useState(false);
  const [newRating, setNewRating] = React.useState(5);
  const [newTitle, setNewTitle] = React.useState('');
  const [newBody, setNewBody] = React.useState('');
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);

  React.useEffect(() => {
    async function loadProductData() {
      try {
        setIsLoading(true);
        setError(null);

        const [prodRes, revRes] = await Promise.all([
          apiFetch<{ product: ProductDetailSummary }>(`/products/${slug}`),
          apiFetch<{ reviews: ProductReviewSummary[] }>(`/products/${slug}/reviews`),
        ]);

        setProduct(prodRes.product);
        setReviews(revRes.reviews);

        // Select first available variant or first variant
        if (prodRes.product.variants.length > 0) {
          const firstInStock = prodRes.product.variants.find((v) => v.availableStock > 0);
          setSelectedVariant(firstInStock || prodRes.product.variants[0]);
        }
      } catch (err: any) {
        console.error('Failed to load product detail:', err);
        setError(err.message || 'Product not found');
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) {
      loadProductData();
    }
  }, [slug]);

  const handleAddToCart = async () => {
    if (!selectedVariant || selectedVariant.availableStock <= 0) return;
    try {
      setIsAdding(true);
      await addItem(selectedVariant.id, quantity);
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/auth/sign-in?next=/supplies/p/${slug}`);
      return;
    }

    try {
      setIsSubmittingReview(true);
      const res = await apiFetch<{ review: ProductReviewSummary }>(`/products/${slug}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: newRating,
          title: newTitle || undefined,
          body: newBody,
        }),
      });

      setReviews((prev) => [res.review, ...prev]);
      setIsReviewOpen(false);
      setNewTitle('');
      setNewBody('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)]">
        <Header />
        <main className="flex-1 py-16 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--color-sage-700)] border-t-transparent animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)]">
        <Header />
        <main className="flex-1 py-20">
          <Container>
            <div className="max-w-md mx-auto text-center space-y-4">
              <h1 className="font-serif text-3xl font-medium text-[var(--color-charcoal-900)]">
                Product Not Found
              </h1>
              <p className="text-sm text-[var(--color-charcoal-600)]">
                The requested item could not be found or is currently unavailable.
              </p>
              <Link href="/supplies">
                <Button variant="primary">Return to Market</Button>
              </Link>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  const isOutOfStock = !selectedVariant || selectedVariant.availableStock <= 0;
  const isLowStock = selectedVariant && selectedVariant.availableStock > 0 && selectedVariant.availableStock <= 3;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)]">
      <Header />

      <main className="flex-1 py-6 md:py-12">
        <Container>
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-[var(--color-charcoal-500)]">
            <Link href="/" className="hover:text-[var(--color-sage-700)] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/supplies" className="hover:text-[var(--color-sage-700)] transition-colors">
              Supplies
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href={`/supplies?category=${product.categorySlug}`}
              className="hover:text-[var(--color-sage-700)] transition-colors"
            >
              {product.categoryName}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--color-charcoal-800)] font-medium truncate max-w-xs">
              {product.name}
            </span>
          </nav>

          {/* Demo Banner */}
          <div className="mb-8 p-3 rounded-[var(--radius-lg)] bg-[var(--color-sage-50)] border border-[var(--color-sage-200)] flex items-center justify-between text-xs text-[var(--color-sage-900)]">
            <div className="flex items-center gap-2">
              <Badge variant="demo">Demo Catalogue Item</Badge>
              <span>This product is part of the PawNest prototype seed data. Orders placed do not bill real credit cards.</span>
            </div>
          </div>

          {/* Main 2-Column Product Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left: Gallery & 3D Interactive Stage */}
            <div className="lg:col-span-7">
              <ProductViewer3D
                productName={product.name}
                imageKeys={product.imageKeys}
                model3dKey={product.model3dKey}
              />
            </div>

            {/* Right: Product Details & Purchase Box */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <span className="text-xs uppercase font-bold tracking-widest text-[var(--color-sage-700)]">
                  {product.brand}
                </span>
                <h1 className="font-serif text-3xl md:text-4xl font-normal text-[var(--color-charcoal-900)] leading-tight">
                  {product.name}
                </h1>

                {/* Rating Link */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <span className="text-sm font-bold text-[var(--color-charcoal-900)]">
                    {product.ratingAvg.toFixed(1)}
                  </span>
                  <a
                    href="#reviews"
                    className="text-xs text-[var(--color-charcoal-500)] underline hover:text-[var(--color-sage-700)] transition-colors"
                  >
                    ({product.ratingCount} reviews)
                  </a>
                </div>
              </div>

              {/* Price & Compare-at */}
              <div className="flex items-baseline gap-3 pt-2 border-t border-[var(--color-ivory-300)]">
                <span className="font-serif text-3xl font-bold text-[var(--color-charcoal-900)]">
                  ${selectedVariant ? (selectedVariant.priceCents / 100).toFixed(2) : '0.00'}
                </span>
                {selectedVariant?.compareAtCents && selectedVariant.compareAtCents > selectedVariant.priceCents && (
                  <span className="text-base text-[var(--color-charcoal-400)] line-through">
                    ${(selectedVariant.compareAtCents / 100).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Variant Picker */}
              {product.variants.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--color-charcoal-800)]">
                      Option / Size:
                    </span>
                    <span className="text-[var(--color-charcoal-500)]">
                      SKU: {selectedVariant?.sku}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      const hasStock = v.availableStock > 0;
                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            setSelectedVariant(v);
                            setQuantity(1);
                          }}
                          className={`px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-semibold border transition-all flex flex-col items-start ${
                            isSelected
                              ? 'border-[var(--color-sage-700)] bg-[var(--color-sage-50)] text-[var(--color-sage-900)] shadow-sm'
                              : 'border-[var(--color-ivory-300)] bg-[var(--color-ivory-50)] text-[var(--color-charcoal-800)] hover:border-[var(--color-sage-300)]'
                          } ${!hasStock ? 'opacity-50' : ''}`}
                        >
                          <span>{v.name}</span>
                          <span className="text-[11px] font-normal text-[var(--color-charcoal-500)]">
                            ${(v.priceCents / 100).toFixed(2)}
                            {!hasStock && ' (Sold out)'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock Status Indicator */}
              <div className="pt-2">
                {isOutOfStock ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-charcoal-600)]">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    Currently Out of Stock
                  </div>
                ) : isLowStock ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-clay-600)]">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    Low Stock: Only {selectedVariant?.availableStock} remaining!
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-sage-700)]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    In Stock — Ready to ship from Brooklyn
                  </div>
                )}
              </div>

              {/* Quantity Stepper & Add to Cart */}
              <div className="pt-2 flex items-center gap-4">
                <div className="flex items-center rounded-full border border-[var(--color-ivory-300)] bg-[var(--color-ivory-50)] p-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-200)] disabled:opacity-40 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-[var(--color-charcoal-900)]">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(20, selectedVariant?.availableStock || 20, q + 1)
                      )
                    }
                    disabled={
                      isOutOfStock ||
                      quantity >= 20 ||
                      (selectedVariant ? quantity >= selectedVariant.availableStock : true)
                    }
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-200)] disabled:opacity-40 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <Button
                  variant="primary"
                  className="flex-1 py-3 text-sm justify-center"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isAdding || isCartLoading}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {isAdding ? 'Adding to Cart...' : isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                </Button>

                <FavouriteButton kind="PRODUCT" id={product.id} size="lg" />
              </div>

              {/* Value Props & Shipping Guarantees */}
              <div className="pt-4 border-t border-[var(--color-ivory-300)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[var(--color-charcoal-600)]">
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-200)]">
                  <Truck className="w-4 h-4 text-[var(--color-sage-700)] flex-shrink-0" />
                  <span>Free shipping on orders over $75</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-200)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-sage-700)] flex-shrink-0" />
                  <span>Veterinarian & trainer tested</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-200)]">
                  <RotateCcw className="w-4 h-4 text-[var(--color-sage-700)] flex-shrink-0" />
                  <span>30-day gentle happiness policy</span>
                </div>
              </div>

              {/* Accordion / Tabs */}
              <div className="pt-4 border-t border-[var(--color-ivory-300)] space-y-4">
                <div className="flex items-center gap-4 border-b border-[var(--color-ivory-300)] pb-2 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('desc')}
                    className={`pb-2 -mb-2 border-b-2 transition-colors ${
                      activeTab === 'desc'
                        ? 'border-[var(--color-sage-700)] text-[var(--color-sage-800)]'
                        : 'border-transparent text-[var(--color-charcoal-500)] hover:text-[var(--color-charcoal-900)]'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('specs')}
                    className={`pb-2 -mb-2 border-b-2 transition-colors ${
                      activeTab === 'specs'
                        ? 'border-[var(--color-sage-700)] text-[var(--color-sage-800)]'
                        : 'border-transparent text-[var(--color-charcoal-500)] hover:text-[var(--color-charcoal-900)]'
                    }`}
                  >
                    Specifications
                  </button>
                  {(product.details?.ingredients || product.details?.materials) && (
                    <button
                      onClick={() => setActiveTab('ingredients')}
                      className={`pb-2 -mb-2 border-b-2 transition-colors ${
                        activeTab === 'ingredients'
                          ? 'border-[var(--color-sage-700)] text-[var(--color-sage-800)]'
                          : 'border-transparent text-[var(--color-charcoal-500)] hover:text-[var(--color-charcoal-900)]'
                      }`}
                    >
                      {product.details?.ingredients ? 'Ingredients' : 'Materials & Care'}
                    </button>
                  )}
                </div>

                <div className="text-xs text-[var(--color-charcoal-700)] leading-relaxed min-h-[100px]">
                  {activeTab === 'desc' && (
                    <div className="space-y-3">
                      <p>{product.description}</p>
                      {product.details?.deliveryEstimate && (
                        <p className="text-[11px] text-[var(--color-sage-800)] font-medium">
                          🚚 {product.details.deliveryEstimate}
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === 'specs' && (
                    <div className="space-y-2">
                      {product.details?.specs ? (
                        Object.entries(product.details.specs).map(([k, v]) => (
                          <div key={k} className="flex justify-between py-1 border-b border-[var(--color-ivory-200)]">
                            <span className="font-medium text-[var(--color-charcoal-500)]">{k}</span>
                            <span className="text-[var(--color-charcoal-900)] font-semibold">{v}</span>
                          </div>
                        ))
                      ) : (
                        <p>Standard architectural pet product specs apply.</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'ingredients' && (
                    <div className="space-y-3">
                      {product.details?.ingredients && (
                        <div>
                          <h4 className="font-semibold text-[var(--color-charcoal-900)] mb-1">Ingredients:</h4>
                          <p>{product.details.ingredients}</p>
                        </div>
                      )}
                      {product.details?.materials && (
                        <div>
                          <h4 className="font-semibold text-[var(--color-charcoal-900)] mb-1">Materials:</h4>
                          <p>{product.details.materials}</p>
                        </div>
                      )}
                      {product.details?.careInstructions && (
                        <div>
                          <h4 className="font-semibold text-[var(--color-charcoal-900)] mb-1">Care Instructions:</h4>
                          <p>{product.details.careInstructions}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <section id="reviews" className="mt-16 pt-12 border-t border-[var(--color-ivory-300)] space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-serif text-2xl md:text-3xl font-normal text-[var(--color-charcoal-900)]">
                  Customer Reflections
                </h2>
                <div className="flex items-center gap-2 text-xs text-[var(--color-charcoal-600)]">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <span className="font-bold text-[var(--color-charcoal-900)]">
                    {product.ratingAvg.toFixed(1)} out of 5
                  </span>
                  <span>· {reviews.length} total reviews</span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="text-xs"
                onClick={() => {
                  if (!user) {
                    router.push(`/auth/sign-in?next=/supplies/p/${slug}`);
                  } else {
                    setIsReviewOpen(!isReviewOpen);
                  }
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                Write a Review
              </Button>
            </div>

            {/* Leave Review Form */}
            {isReviewOpen && (
              <form
                onSubmit={handleSubmitReview}
                className="p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-sage-300)] shadow-[var(--shadow-1)] space-y-4 max-w-xl animate-fade-in"
              >
                <h3 className="font-serif text-lg text-[var(--color-charcoal-900)]">
                  Share your pet’s experience
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--color-charcoal-700)]">
                    Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className={`p-1 text-amber-500 transition-transform hover:scale-110 ${
                          newRating >= star ? 'fill-current' : 'opacity-30'
                        }`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--color-charcoal-700)]">
                    Headline (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. My puppy is obsessed with this!"
                    className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--color-charcoal-700)]">
                    Review Details
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="How did your pet like the texture, taste, or comfort?"
                    className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setIsReviewOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={isSubmittingReview || !newBody.trim()}
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                  </Button>
                </div>
              </form>
            )}

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <p className="text-xs text-[var(--color-charcoal-500)] italic">
                No reviews yet. Be the first companion to share thoughts!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-200)] space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-current' : 'opacity-20'
                            }`}
                          />
                        ))}
                      </div>
                      {rev.isSample && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-ivory-200)] text-[var(--color-charcoal-600)] border border-[var(--color-ivory-300)]">
                          Sample Review
                        </span>
                      )}
                    </div>

                    {rev.title && (
                      <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)]">
                        {rev.title}
                      </h4>
                    )}

                    <p className="text-xs text-[var(--color-charcoal-600)] leading-relaxed">
                      {rev.body}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[var(--color-charcoal-400)] pt-1 border-t border-[var(--color-ivory-200)]">
                      <span>{rev.userName}</span>
                      <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
