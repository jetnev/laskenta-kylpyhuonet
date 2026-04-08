interface PublicStructuredDataProps {
  items: Array<Record<string, unknown>>;
}

export default function PublicStructuredData({ items }: PublicStructuredDataProps) {
  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}