import React from 'react'
import type { Todo } from '../../../types'
import { FaCheckCircle, FaCircle } from 'react-icons/fa'

interface TodoListProps {
  todos: Todo[]
  onUpdate: () => void
}

const TodoList: React.FC<TodoListProps> = ({ todos }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 h-full">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic To-Do List</h2>
      {todos.length === 0 ? (
        <p className="text-gray-500 text-sm">You have no tasks yet. Great job staying on top of things!</p>
      ) : (
        <ul className="space-y-3 max-h-80 overflow-y-auto">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-100"
            >
              <div className="flex items-start space-x-3">
                {todo.completed ? (
                  <FaCheckCircle className="mt-1 h-4 w-4 text-green-500" />
                ) : (
                  <FaCircle className="mt-1 h-4 w-4 text-gray-300" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{todo.title}</p>
                  {todo.description && (
                    <p className="text-xs text-gray-500 mt-1">{todo.description}</p>
                  )}
                  <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                    <span>
                      Due:{' '}
                      {new Date(todo.due_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        todo.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : todo.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {todo.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TodoList


