// Компонент Layout служит как общий "каркас" (layout) для всего приложения.
// В нём определены общие части интерфейса: шапка (header), основное содержимое (main) и подвал (footer).

// Компонент принимает проп children — это всё, что будет вставлено внутрь Layout
// (например, компоненты App, OutfitPreview, Controls и т.д.)
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    // Весь layout оборачивается в div с классом "app"
    // Этот класс используется в CSS для задания общих стилей: отступов, max-width и фона
    <div className="app">
      {/* HEADER — верхняя часть страницы */}
      {/* Здесь отображается название приложения */}
      <header className="header">Stylify</header>

      {/* MAIN — основное содержимое приложения */}
      {/* Здесь будут находиться все переданные через props элементы (children),
          например: фильтры, каталог и примерочная */}
      <main className="content">{children}</main>

      {/* FOOTER — нижняя часть страницы */}
      {/* Можно указать год, копирайт, ссылку и т.д. */}
      <footer className="footer">2025</footer>
    </div>
  );
}
