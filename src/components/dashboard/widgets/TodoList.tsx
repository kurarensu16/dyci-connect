import React from 'react'
import type { Todo } from '../../../types'
import { FaCheckCircle, FaCircle } from 'react-icons/fa'

interface TodoListProps {
  todos: Todo[]
}

const TodoList: React.FC<TodoListProps> = ({ todos }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Academic To-Do List</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
          Last 5 Tasks
        </span>
      </div>
      {todos.length === 0 ? (
        <p className="text-gray-500 text-sm">You have no tasks yet. Great job staying on top of things!</p>
      ) : (
        <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className={`flex flex-col p-3 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors ${todo.status === 3 ? 'bg-slate-50 opacity-80' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start space-x-3">
                  {todo.status === 3 ? (
                    <FaCheckCircle className="mt-1 h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <FaCircle className={`mt-1 h-3.5 w-3.5 shrink-0 ${todo.priority === 'high' ? 'text-rose-500' : todo.priority === 'standard' ? 'text-blue-500' : 'text-emerald-500'}`} />
                  )}
                  <div>
                    <p className={`text-sm font-semibold text-gray-900 ${todo.status === 3 ? 'line-through text-gray-500' : ''}`}>
                      {todo.title}
                    </p>
                    {todo.description && (
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{todo.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {todo.progress}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-50">
                <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                  <span className="font-medium">
                    Due:{' '}
                    {todo.due_date ? new Date(todo.due_date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    }) : 'N/A'}
                  </span>
                </div>
                <span
                  className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${todo.priority === 'high'
                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                    : todo.priority === 'standard'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}
                >
                  {todo.priority}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TodoList


