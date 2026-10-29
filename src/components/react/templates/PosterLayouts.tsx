import type { PublicCategory, PublicItem } from "../../../lib/store-helpers";
import {
  CatalogEmpty,
  CatalogNav,
  Identity,
  ItemPurchase,
  ProductRow,
  TemplateShell,
  type TemplateProps,
} from "./shared";
import "./PosterLayouts.css";

function CategoryEmpty() {
  return (
    <p className="poster-category-empty">No hay productos en esta categoría.</p>
  );
}

export function BillboardLayout(props: TemplateProps) {
  const { store, isOpen, onAddToCart } = props;
  const title = store.presentation === "catalog" ? "Catálogo" : "Menú";
  const hero = store.items.find((item) => item.imageUrl);

  return (
    <TemplateShell {...props} variant="billboard">
      <header className="billboard-header">
        <Identity store={store} isOpen={isOpen} />
        <div className="billboard-masthead">
          <div>
            <h1>{store.name}</h1>
            <a href="#atelier-catalog" className="billboard-action">
              Ver {title.toLowerCase()}
            </a>
          </div>
          {hero?.imageUrl ? (
            <img
              className="billboard-hero-photo"
              src={hero.imageUrl}
              alt={hero.name}
              fetchPriority="high"
              width="720"
              height="720"
            />
          ) : (
            <div className="billboard-hero-type" aria-hidden="true">
              {title}
            </div>
          )}
        </div>
        <CatalogNav store={store} />
      </header>
      <section
        id="atelier-catalog"
        className="billboard-catalog"
        aria-label={title.toLowerCase()}
      >
        {store.categories.length ? (
          store.categories.map((category) => (
            <BillboardCategory
              key={category.id}
              category={category}
              store={store}
              onAddToCart={onAddToCart}
            />
          ))
        ) : (
          <CatalogEmpty />
        )}
      </section>
    </TemplateShell>
  );
}

function BillboardCategory({
  category,
  store,
  onAddToCart,
}: { category: PublicCategory } & Pick<
  TemplateProps,
  "store" | "onAddToCart"
>) {
  return (
    <section id={`category-${category.id}`} className="billboard-category">
      <h2>
        <span>{category.name}</span>
      </h2>
      {category.items.length ? (
        <div className="billboard-items">
          {category.items.map((item) => (
            <ProductRow
              key={item.id}
              item={item}
              store={store}
              onAddToCart={onAddToCart}
              image={false}
              className="billboard-item"
            />
          ))}
        </div>
      ) : (
        <CategoryEmpty />
      )}
    </section>
  );
}

export function SpotlightLayout(props: TemplateProps) {
  const { store, isOpen, onAddToCart } = props;
  const hero = store.items.find((item) => item.imageUrl);
  const title = store.presentation === "catalog" ? "Catálogo" : "Menú";

  return (
    <TemplateShell {...props} variant="spotlight">
      <header
        className={`spotlight-hero ${hero ? "spotlight-hero--photo" : "spotlight-hero--type"}`}
      >
        <Identity store={store} isOpen={isOpen} />
        <div className="spotlight-intro">
          <h1>{store.name}</h1>
          <a href="#atelier-catalog">Ver {title.toLowerCase()}</a>
        </div>
        {hero?.imageUrl ? (
          <img
            className="spotlight-photo"
            src={hero.imageUrl}
            alt={hero.name}
            fetchPriority="high"
            width="1200"
            height="900"
          />
        ) : (
          <div className="spotlight-fallback" aria-hidden="true">
            {title}
          </div>
        )}
      </header>
      <section
        id="atelier-catalog"
        className="spotlight-catalog"
        aria-label={title.toLowerCase()}
      >
        <CatalogNav store={store} />
        {store.categories.length ? (
          store.categories.map((category, index) => (
            <SpotlightCategory
              key={category.id}
              category={category}
              index={index}
              store={store}
              onAddToCart={onAddToCart}
            />
          ))
        ) : (
          <CatalogEmpty />
        )}
      </section>
    </TemplateShell>
  );
}

function SpotlightCategory({
  category,
  index,
  store,
  onAddToCart,
}: { category: PublicCategory; index: number } & Pick<
  TemplateProps,
  "store" | "onAddToCart"
>) {
  const feature = category.items.find((item) => item.imageUrl);
  return (
    <section
      id={`category-${category.id}`}
      className={`spotlight-category spotlight-category--${index % 2 ? "right" : "left"}`}
    >
      <div className="spotlight-category-heading">
        <h2>{category.name}</h2>
        {feature?.imageUrl && (
          <img
            src={feature.imageUrl}
            alt={feature.name}
            loading="lazy"
            width="500"
            height="360"
          />
        )}
      </div>
      {category.items.length ? (
        <div className="spotlight-products">
          {category.items.map((item) => (
            <ProductRow
              key={item.id}
              item={item}
              store={store}
              onAddToCart={onAddToCart}
              className="spotlight-item"
            />
          ))}
        </div>
      ) : (
        <CategoryEmpty />
      )}
    </section>
  );
}

export function RibbonLayout(props: TemplateProps) {
  const { store, isOpen, onAddToCart } = props;
  const title = store.presentation === "catalog" ? "Catálogo" : "Menú";
  return (
    <TemplateShell {...props} variant="ribbon">
      <header className="ribbon-header">
        <div className="ribbon-side-title" aria-hidden="true">
          {title}
        </div>
        <div className="ribbon-top">
          <Identity store={store} isOpen={isOpen} />
          <h1>{store.name}</h1>
          <a href="#atelier-catalog">Ver {title.toLowerCase()}</a>
        </div>
        <CatalogNav store={store} />
      </header>
      <section
        id="atelier-catalog"
        className="ribbon-catalog"
        aria-label={title.toLowerCase()}
      >
        {store.categories.length ? (
          store.categories.map((category) => (
            <section
              id={`category-${category.id}`}
              className="ribbon-category"
              key={category.id}
            >
              <h2>{category.name}</h2>
              {category.items.length ? (
                <div className="ribbon-products">
                  {category.items.map((item) => (
                    <RibbonProduct
                      key={item.id}
                      item={item}
                      store={store}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </div>
              ) : (
                <CategoryEmpty />
              )}
            </section>
          ))
        ) : (
          <CatalogEmpty />
        )}
      </section>
    </TemplateShell>
  );
}

function RibbonProduct({
  item,
  store,
  onAddToCart,
}: { item: PublicItem } & Pick<TemplateProps, "store" | "onAddToCart">) {
  return (
    <article
      className={`ribbon-product ${item.imageUrl ? "ribbon-product--photo" : ""}`}
    >
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          width="360"
          height="280"
        />
      )}
      <div className="ribbon-copy">
        <h3>{item.name}</h3>
        {item.description && <p>{item.description}</p>}
      </div>
      <div className="ribbon-purchase">
        <ItemPurchase item={item} store={store} onAddToCart={onAddToCart} />
      </div>
    </article>
  );
}
