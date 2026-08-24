#include <iostream>
#include <string>

using namespace std;

int main() {
    string name;
    int id;

    cout << "Enter your name: ";
    cin >> name;

    cout << "Enter your ID: ";
    cin >> id;

    cout << "\n===== Student Result =====" << endl;
    cout << "Name: " << name << endl;
    cout << "ID: " << id << endl;

    return 0;
}