import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import StartScreen from "./routes/StartScreen";
import WizardScreen from "./routes/WizardScreen";
import EditorScreen from "./routes/EditorScreen";
import { ToastProvider } from "./hooks/useToast";
import { ToastViewport } from "./components/ToastViewport";
import "./styles/app.css";

/**
 * Три маршрута приложения (docs/02-ux.md, «Навигация и структура»):
 *  - "/"            — стартовый список проектов
 *  - "/new"         — мастер создания
 *  - "/editor/:id"  — редактор + предпросмотр
 *
 * Все оверлеи (диалоги, шторки) живут внутри EditorScreen как
 * локальное UI-состояние и НЕ получают собственных маршрутов.
 *
 * Эта разводка — граница между шагом 4 и шагом 6: три компонента
 * ниже сейчас заглушки, шаг 6 наполняет их содержимым, не трогая
 * саму структуру маршрутов в этом файле (если понадобится общий
 * layout/провайдер — это тоже зона шага 6, при условии что структура
 * трёх URL остаётся неизменной).
 */
export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/new" element={<WizardScreen />} />
          <Route path="/editor/:id" element={<EditorScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastViewport />
    </ToastProvider>
  );
}
