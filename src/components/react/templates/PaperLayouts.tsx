import type { PublicCategory, PublicItem } from "../../../lib/store-helpers";
import {
  CatalogEmpty,
  CatalogNav,
  Identity,
  ProductRow,
  TemplateShell,
  type TemplateProps,
} from "./shared";
import "./PaperLayouts.css";

const catalogLabel = (presentation: TemplateProps["store"]["presentation"]) =>
  presentation === "catalog" ? "catálogo" : "menú";

function CategoryEmpty() {
  return (
    <p className="atelier-category-empty" role="status">
      No hay productos en esta categoría.
    </p>
  );
}

function firstPhotographedItem(
  store: TemplateProps["store"],
): PublicItem | undefined {
  return store.items.find((item) => item.imageUrl);
}

export function GardenLayout(props: TemplateProps) {
  const { store, isOpen, onAddToCart } = props;
  const featured = firstPhotographedItem(store);

  return (
    <TemplateShell {...props} variant="garden">
      <header className="garden-hero">
        <div className="garden-hero__identity">
          <Identity store={store} isOpen={isOpen} />
        </div>
        <div className="garden-hero__heading">
          <h1>{store.name}</h1>
          <a href="#atelier-catalog">Ver {catalogLabel(store.presentation)}</a>
        </div>
        {featured?.imageUrl && (
          <figure className="garden-hero__photo">
            <img
              src={featured.imageUrl}
              alt={featured.name}
              fetchPriority="high"
            />
          </figure>
        )}
      </header>
      <CatalogNav store={store} />
      <section
        id="atelier-catalog"
        className="garden-catalog"
        aria-label={catalogLabel(store.presentation)}
      >
        {store.categories.length ? (
          store.categories.map((category) => (
            <GardenCategory
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

function GardenCategory({
  category,
  store,
  onAddToCart,
}: {
  category: PublicCategory;
  store: TemplateProps["store"];
  onAddToCart: TemplateProps["onAddToCart"];
}) {
  return (
    <section id={`category-${category.id}`} className="garden-category">
      <h2>
        <span>{category.name}</span>
      </h2>
      {category.items.length ? (
        <div className="garden-category__items">
          {category.items.map((item) => (
            <ProductRow
              key={item.id}
              item={item}
              store={store}
              onAddToCart={onAddToCart}
              image={false}
            />
          ))}
        </div>
      ) : (
        <CategoryEmpty />
      )}
    </section>
  );
}

export function ChronicleLayout(props: TemplateProps) {
  const { store, isOpen, onAddToCart } = props;

  return (
    <TemplateShell {...props} variant="chronicle">
      <header className="chronicle-hero">
        <Identity store={store} isOpen={isOpen} />
        <div className="chronicle-hero__title">
          <h1>{store.name}</h1>
          <a href="#atelier-catalog">
            Explorar {catalogLabel(store.presentation)}
          </a>
        </div>
      </header>
      <CatalogNav store={store} />
      <section
        id="atelier-catalog"
        className="chronicle-catalog"
        aria-label={catalogLabel(store.presentation)}
      >
        {store.categories.length ? (
          store.categories.map((category) => (
            <ChronicleCategory
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

function ChronicleCategory({
  category,
  store,
  onAddToCart,
}: {
  category: PublicCategory;
  store: TemplateProps["store"];
  onAddToCart: TemplateProps["onAddToCart"];
}) {
  return (
    <section id={`category-${category.id}`} className="chronicle-category">
      <h2>{category.name}</h2>
      {category.items.length ? (
        <div className="chronicle-route">
          {category.items.map((item) => (
            <ProductRow
              key={item.id}
              item={item}
              store={store}
              onAddToCart={onAddToCart}
              className="chronicle-product"
            />
          ))}
        </div>
      ) : (
        <CategoryEmpty />
      )}
    </section>
  );
}

export function InvitationLayout(props: TemplateProps) {
  const { store, isOpen, onAddToCart } = props;

  return (
    <TemplateShell {...props} variant="invitation">
      <header className="invitation-masthead">
        <Identity store={store} isOpen={isOpen} />
        <h1>{store.name}</h1>
        <a href="#atelier-catalog">Ver {catalogLabel(store.presentation)}</a>
      </header>
      <CatalogNav store={store} />
      <section
        id="atelier-catalog"
        className="invitation-paper"
        aria-label={catalogLabel(store.presentation)}
      >
        {store.categories.length ? (
          store.categories.map((category) => (
            <InvitationCategory
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

function InvitationCategory({
  category,
  store,
  onAddToCart,
}: {
  category: PublicCategory;
  store: TemplateProps["store"];
  onAddToCart: TemplateProps["onAddToCart"];
}) {
  const imageItem = category.items.find((item) => item.imageUrl);
  return (
    <section id={`category-${category.id}`} className="invitation-category">
      {imageItem?.imageUrl && (
        <img
          className="invitation-category__photo"
          src={imageItem.imageUrl}
          alt={imageItem.name}
          loading="lazy"
        />
      )}
      <h2>{category.name}</h2>
      {category.items.length ? (
        <div className="invitation-category__items">
          {category.items.map((item) => (
            <ProductRow
              key={item.id}
              item={item}
              store={store}
              onAddToCart={onAddToCart}
              image={false}
            />
          ))}
        </div>
      ) : (
        <CategoryEmpty />
      )}
    </section>
  );
}
