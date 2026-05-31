import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100 p-8 text-center">
          <div className="text-6xl mb-4">🧚</div>
          <h1 className="text-2xl font-bold text-amber-800 mb-2">哎呀，出错了</h1>
          <p className="text-amber-600 mb-6 max-w-xs">魔法好像出了点问题，刷新一下页面就好了~</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-amber-500 text-white rounded-2xl font-bold text-lg hover:bg-amber-600 transition-colors"
          >
            重新开始
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
